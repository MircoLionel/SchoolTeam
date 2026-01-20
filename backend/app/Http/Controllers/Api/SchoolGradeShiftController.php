<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolGradeShift;
use Illuminate\Http\Request;

class SchoolGradeShiftController extends Controller
{
    public function index()
    {
        $groups = SchoolGradeShift::query()
            ->orderBy('school_id')
            ->orderBy('grade_id')
            ->orderBy('shift_id')
            ->get();

        return response()->json($groups);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'school_id' => ['required', 'exists:schools,id'],
            'grade_id' => ['required', 'exists:grades,id'],
            'shift_id' => ['required', 'exists:shifts,id'],
            'route' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'contact_email' => ['nullable', 'string', 'max:255'],
        ]);

        $group = SchoolGradeShift::create($data);

        return response()->json($group, 201);
    }

    public function show(int $id)
    {
        $group = SchoolGradeShift::findOrFail($id);

        return response()->json($group);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'school_id' => ['required', 'exists:schools,id'],
            'grade_id' => ['required', 'exists:grades,id'],
            'shift_id' => ['required', 'exists:shifts,id'],
            'route' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'contact_email' => ['nullable', 'string', 'max:255'],
        ]);

        $group = SchoolGradeShift::findOrFail($id);
        $group->update($data);

        return response()->json($group);
    }

    public function destroy(int $id)
    {
        $group = SchoolGradeShift::findOrFail($id);
        $group->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
