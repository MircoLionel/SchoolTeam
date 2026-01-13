<?php

namespace App\Services;

use App\Enums\AccountMovementType;
use App\Enums\CouponStatus;
use App\Enums\PaymentMethod;
use App\Models\AccountMovement;
use App\Models\AuditLog;
use App\Models\Coupon;
use App\Models\Payment;
use App\Models\PaymentDetail;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CouponCollectionService
{
    public function collect(Coupon $coupon, float $amountCollected, ?string $reason, int $userId, string $ip): Payment
    {
        if ($coupon->status !== CouponStatus::ISSUED) {
            throw ValidationException::withMessages(['coupon' => 'El cupón no está disponible para cobrar.']);
        }

        if ($amountCollected !== (float) $coupon->amount_printed && !$reason) {
            throw ValidationException::withMessages(['reason' => 'Debe indicar el motivo de la diferencia.']);
        }

        return DB::transaction(function () use ($coupon, $amountCollected, $reason, $userId, $ip) {
            $before = $coupon->toArray();

            $payment = Payment::create([
                'passenger_id' => $coupon->checkbook->passenger_id,
                'trip_id' => $coupon->checkbook->trip_id,
                'date' => now()->toDateString(),
                'method' => PaymentMethod::CASH->value,
                'amount_total' => $amountCollected,
                'created_by' => $userId,
                'notes' => $reason,
            ]);

            PaymentDetail::create([
                'payment_id' => $payment->id,
                'coupon_id' => $coupon->id,
                'kind' => 'COUPON',
                'amount' => $amountCollected,
            ]);

            $coupon->update([
                'status' => CouponStatus::COLLECTED,
                'collected_by_user_id' => $userId,
                'collected_at' => now(),
            ]);

            AccountMovement::create([
                'passenger_id' => $coupon->checkbook->passenger_id,
                'trip_id' => $coupon->checkbook->trip_id,
                'date' => now()->toDateString(),
                'type' => AccountMovementType::CUOTA->value,
                'amount' => $amountCollected,
                'payment_id' => $payment->id,
                'notes' => null,
                'created_by' => $userId,
            ]);

            if ($amountCollected !== (float) $coupon->amount_printed) {
                AccountMovement::create([
                    'passenger_id' => $coupon->checkbook->passenger_id,
                    'trip_id' => $coupon->checkbook->trip_id,
                    'date' => now()->toDateString(),
                    'type' => AccountMovementType::AJUSTE->value,
                    'amount' => $amountCollected - $coupon->amount_printed,
                    'payment_id' => $payment->id,
                    'notes' => $reason,
                    'created_by' => $userId,
                ]);
            }

            AuditLog::create([
                'entity' => 'coupons',
                'entity_id' => $coupon->id,
                'action' => 'COLLECT',
                'before_json' => $before,
                'after_json' => $coupon->fresh()->toArray(),
                'user_id' => $userId,
                'ip' => $ip,
                'created_at' => now(),
            ]);

            return $payment;
        });
    }
}
