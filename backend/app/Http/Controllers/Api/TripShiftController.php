<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TripShiftController extends Controller
{
    public function store(int $tripId, Request $request)
    {
        $request->validate(['shift_id' => ['required', 'integer']]);

        return response()->json(['trip_id' => $tripId, 'shift_id' => $request->get('shift_id')]);
    }

    public function destroy(int $tripId, int $shiftId)
    {
        return response()->json(['trip_id' => $tripId, 'shift_id' => $shiftId, 'message' => 'Eliminado']);
    }
}
