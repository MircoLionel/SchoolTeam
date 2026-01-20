<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function index()
    {
        $shifts = Shift::query()
            ->orderBy('name')
            ->get();

        return response()->json($shifts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $shift = Shift::create($data);

        return response()->json($shift, 201);
    }

    public function show(int $id)
    {
        $shift = Shift::findOrFail($id);

        return response()->json($shift);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $shift = Shift::findOrFail($id);
        $shift->update($data);

        return response()->json($shift);
    }

    public function destroy(int $id)
    {
        $shift = Shift::findOrFail($id);
        $shift->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
