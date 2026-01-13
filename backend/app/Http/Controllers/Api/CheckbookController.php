<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckbookRequest;
use App\Models\Checkbook;
use App\Services\CheckbookService;

class CheckbookController extends Controller
{
    public function store(CheckbookRequest $request, CheckbookService $service)
    {
        $checkbook = $service->generate(
            $request->get('passenger_id'),
            $request->get('trip_id'),
            $request->get('plan_id')
        );

        return response()->json($checkbook, 201);
    }

    public function downloadPdf(Checkbook $checkbook)
    {
        return response()->json(['pdf' => $checkbook->code . '.pdf']);
    }
}
