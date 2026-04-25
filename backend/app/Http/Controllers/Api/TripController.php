<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function index(Request $request)
    {
        $query = Trip::query()->with(['school', 'grade', 'shifts', 'latestBudget']);

        if ($request->filled('school_id')) {
            $query->where('school_id', $request->integer('school_id'));
        }

        return response()->json(
            $query->orderByDesc('year')->get()->map(fn (Trip $trip) => $this->serializeTrip($trip))->all()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'school_id' => ['required', 'integer', 'exists:schools,id'],
            'grade_id' => ['required', 'integer', 'exists:grades,id'],
            'contract_number' => ['required', 'string', 'max:80'],
            'destination' => ['required', 'string'],
            'group_name' => ['required', 'string'],
            'year' => ['required', 'integer'],
            'status' => ['nullable', 'string'],
        ]);

        $trip = Trip::create($data);

        $trip->load(['school', 'grade', 'shifts', 'latestBudget']);

        return response()->json($this->serializeTrip($trip), 201);
    }

    public function show(Trip $trip)
    {
        $trip->load(['school', 'grade', 'shifts', 'latestBudget']);

        return response()->json($this->serializeTrip($trip));
    }

    public function update(Request $request, Trip $trip)
    {
        $data = $request->validate([
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'grade_id' => ['sometimes', 'integer', 'exists:grades,id'],
            'contract_number' => ['sometimes', 'string', 'max:80'],
            'destination' => ['sometimes', 'string'],
            'group_name' => ['sometimes', 'string'],
            'year' => ['sometimes', 'integer'],
            'status' => ['sometimes', 'string'],
        ]);

        $trip->update($data);

        $trip->load(['school', 'grade', 'shifts', 'latestBudget']);

        return response()->json($this->serializeTrip($trip));
    }

    public function destroy(Trip $trip)
    {
        $trip->delete();

        return response()->json(['message' => 'Eliminado']);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeTrip(Trip $trip): array
    {
        $price = (float) ($trip->latestBudget?->base_price_100 ?? 0);

        return array_merge($trip->toArray(), [
            'trip_value' => $price,
            'price_per_passenger' => $price,
        ]);
    }
}
