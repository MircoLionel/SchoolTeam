<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\Request;

class SchoolController extends Controller
{
    public function index()
    {
        $schools = School::query()
            ->orderBy('name')
            ->get();

        return response()->json($schools);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $school = School::create($data);

        return response()->json($school, 201);
    }

    public function show(int $id)
    {
        $school = School::findOrFail($id);

        return response()->json($school);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $school = School::findOrFail($id);
        $school->update($data);

        return response()->json($school);
    }

    public function destroy(int $id)
    {
        $school = School::findOrFail($id);
        $school->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
