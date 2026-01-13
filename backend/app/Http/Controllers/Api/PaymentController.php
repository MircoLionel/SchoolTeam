<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\NonCashPaymentRequest;
use App\Models\InternalReceipt;
use App\Services\NonCashPaymentService;

class PaymentController extends Controller
{
    public function storeNonCash(NonCashPaymentRequest $request, NonCashPaymentService $service)
    {
        $payment = $service->register($request->validated(), $request->user()->id);

        return response()->json(['payment' => $payment]);
    }

    public function receipt(int $paymentId)
    {
        $receipt = InternalReceipt::where('payment_id', $paymentId)->firstOrFail();

        return response()->json($receipt);
    }
}
