<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index()
    {
        return response()->json(Grade::query()->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
        ]);

        $grade = Grade::create($data);

        return response()->json($grade, 201);
    }

    public function show(Grade $grade)
    {
        return response()->json($grade);
    }

    public function update(Request $request, Grade $grade)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
        ]);

        $grade->update($data);

        return response()->json($grade);
    }

    public function destroy(Grade $grade)
    {
        $grade->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
