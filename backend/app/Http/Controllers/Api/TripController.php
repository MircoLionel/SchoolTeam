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

        return response()->json($query->orderByDesc('year')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'school_id' => ['required', 'integer', 'exists:schools,id'],
            'grade_id' => ['required', 'integer', 'exists:grades,id'],
            'destination' => ['required', 'string'],
            'group_name' => ['required', 'string'],
            'year' => ['required', 'integer'],
            'status' => ['nullable', 'string'],
        ]);

        $trip = Trip::create($data);

        return response()->json($trip->load(['school', 'grade', 'shifts', 'latestBudget']), 201);
    }

    public function show(Trip $trip)
    {
        return response()->json($trip->load(['school', 'grade', 'shifts', 'latestBudget']));
    }

    public function update(Request $request, Trip $trip)
    {
        $data = $request->validate([
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'grade_id' => ['sometimes', 'integer', 'exists:grades,id'],
            'destination' => ['sometimes', 'string'],
            'group_name' => ['sometimes', 'string'],
            'year' => ['sometimes', 'integer'],
            'status' => ['sometimes', 'string'],
        ]);

        $trip->update($data);

        return response()->json($trip->load(['school', 'grade', 'shifts', 'latestBudget']));
    }

    public function destroy(Trip $trip)
    {
        $trip->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
