<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Passenger;
use App\Models\Trip;

class DashboardController extends Controller
{
    public function summary()
    {
        return response()->json([
            'total_trips' => Trip::query()->count(),
            'total_passengers' => Passenger::query()->count(),
            'total_audit_events' => AuditLog::query()->count(),
        ]);
    }
}
