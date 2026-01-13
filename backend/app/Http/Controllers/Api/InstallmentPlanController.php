<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InstallmentPlanRequest;
use App\Models\Installment;
use App\Models\InstallmentPlan;
use App\Services\InstallmentPlanService;
use Illuminate\Http\Request;

class InstallmentPlanController extends Controller
{
    public function store(InstallmentPlanRequest $request, InstallmentPlanService $service)
    {
        $plan = $service->generate(
            $request->get('passenger_id'),
            $request->get('trip_id'),
            $request->get('count'),
            $request->user()->id
        );

        return response()->json($plan, 201);
    }

    public function show(InstallmentPlan $plan)
    {
        return response()->json($plan->load('installments'));
    }

    public function updateInstallment(Request $request, Installment $installment)
    {
        $request->validate(['amount_planned' => ['required', 'numeric', 'min:0']]);
        $installment->update(['amount_planned' => $request->get('amount_planned')]);

        return response()->json($installment);
    }
}
