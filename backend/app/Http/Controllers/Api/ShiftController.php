<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function index()
    {
        return response()->json(Shift::query()->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
        ]);

        $shift = Shift::create($data);

        return response()->json($shift, 201);
    }

    public function show(Shift $shift)
    {
        return response()->json($shift);
    }

    public function update(Request $request, Shift $shift)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
        ]);

        $shift->update($data);

        return response()->json($shift);
    }

    public function destroy(Shift $shift)
    {
        $shift->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
