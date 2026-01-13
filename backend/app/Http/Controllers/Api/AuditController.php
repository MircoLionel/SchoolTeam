<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $logs = AuditLog::query()
            ->when($request->get('entity'), fn ($q) => $q->where('entity', $request->get('entity')))
            ->when($request->get('user_id'), fn ($q) => $q->where('user_id', $request->get('user_id')))
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($logs);
    }
}
