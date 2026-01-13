<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function passengers(Request $request)
    {
        return response()->json(['message' => 'Reporte de pasajeros (placeholder).']);
    }

    public function passengerStatus(Request $request)
    {
        return response()->json(['message' => 'Reporte estado por pasajero (placeholder).']);
    }

    public function cashbox(Request $request)
    {
        return response()->json(['message' => 'Reporte de caja (ADMIN).']);
    }

    public function providerProfit(Request $request)
    {
        return response()->json(['message' => 'Reporte ganancia por proveedor (ADMIN).']);
    }

    public function passengerAccount(int $passengerId, Request $request)
    {
        return response()->json(['passenger_id' => $passengerId, 'trip_id' => $request->get('tripId')]);
    }
}
