<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index()
    {
        $grades = Grade::query()
            ->orderBy('name')
            ->get();

        return response()->json($grades);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $grade = Grade::create($data);

        return response()->json($grade, 201);
    }

    public function show(int $id)
    {
        $grade = Grade::findOrFail($id);

        return response()->json($grade);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $grade = Grade::findOrFail($id);
        $grade->update($data);

        return response()->json($grade);
    }

    public function destroy(int $id)
    {
        $grade = Grade::findOrFail($id);
        $grade->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
