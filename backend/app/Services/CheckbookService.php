<?php

namespace App\Services;

use App\Models\Checkbook;
use App\Models\Coupon;
use App\Models\Installment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckbookService
{
    public function generate(int $passengerId, int $tripId, int $planId): Checkbook
    {
        return DB::transaction(function () use ($passengerId, $tripId, $planId) {
            $code = sprintf('CHK-%s-%s', now()->format('Y'), Str::upper(Str::random(4)));

            $checkbook = Checkbook::create([
                'passenger_id' => $passengerId,
                'trip_id' => $tripId,
                'plan_id' => $planId,
                'code' => $code,
                'status' => 'ACTIVE',
            ]);

            $installments = Installment::where('plan_id', $planId)->orderBy('number')->get();
            foreach ($installments as $installment) {
                Coupon::create([
                    'checkbook_id' => $checkbook->id,
                    'installment_number' => $installment->number,
                    'amount_printed' => $installment->amount_planned,
                    'barcode_value' => 'CUP-' . $checkbook->id . '-' . Str::random(6),
                    'status' => 'ISSUED',
                ]);
            }

            return $checkbook;
        });
    }
}
