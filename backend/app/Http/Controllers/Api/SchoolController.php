<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\Request;

class SchoolController extends Controller
{
    public function index()
    {
        return response()->json(School::query()->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'locality' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
        ]);

        $school = School::create($data);

        return response()->json($school, 201);
    }

    public function show(School $school)
    {
        return response()->json($school);
    }

    public function update(Request $request, School $school)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string'],
            'locality' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
        ]);

        $school->update($data);

        return response()->json($school);
    }

    public function destroy(School $school)
    {
        $school->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
