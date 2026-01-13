<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CollectCouponRequest;
use App\Models\Coupon;
use App\Services\CouponCollectionService;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function scan(Request $request)
    {
        $request->validate(['barcode' => ['required', 'string']]);

        $coupon = Coupon::where('barcode_value', $request->get('barcode'))->firstOrFail();

        return response()->json($coupon);
    }

    public function collect(CollectCouponRequest $request, Coupon $coupon, CouponCollectionService $service)
    {
        $payment = $service->collect(
            $coupon,
            (float) $request->get('amount_collected'),
            $request->get('reason'),
            $request->user()->id,
            $request->ip()
        );

        return response()->json(['payment' => $payment]);
    }
}
