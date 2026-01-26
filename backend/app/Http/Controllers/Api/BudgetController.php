<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(Request $request)
    {
        $query = Budget::query()->with(['trip.school']);

        if ($request->filled('school_id')) {
            $query->whereHas('trip', function ($builder) use ($request) {
                $builder->where('school_id', $request->integer('school_id'));
            });
        }

        if ($request->filled('trip_id')) {
            $query->where('trip_id', $request->integer('trip_id'));
        }

        return response()->json(
            $query->orderBy('trip_id')->orderByDesc('version')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'base_price_100' => ['required', 'numeric', 'min:0'],
            'suggested_installments' => ['required', 'integer', 'min:1'],
            'version' => ['required', 'integer', 'min:1'],
            'status' => ['nullable', 'string'],
            'pdf_path' => ['nullable', 'string'],
        ]);

        $budget = Budget::create($data);

        return response()->json($budget->load('trip.school'), 201);
    }

    public function show(Budget $budget)
    {
        return response()->json($budget->load('trip.school'));
    }

    public function update(Request $request, Budget $budget)
    {
        $data = $request->validate([
            'base_price_100' => ['sometimes', 'numeric', 'min:0'],
            'suggested_installments' => ['sometimes', 'integer', 'min:1'],
            'version' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', 'string'],
            'pdf_path' => ['nullable', 'string'],
        ]);

        $budget->update($data);

        return response()->json($budget->load('trip.school'));
    }

    public function destroy(Budget $budget)
    {
        $budget->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
