<?php

namespace App\Services;

use App\Enums\AccountMovementType;
use App\Enums\PaymentMethod;
use App\Models\AccountMovement;
use App\Models\CashCategory;
use App\Models\CashMovement;
use App\Models\Payment;
use App\Models\Passenger;
use App\Models\PaymentDetail;
use Illuminate\Support\Facades\DB;

class CouponCollectPaymentService
{
    public function register(array $payload, int $userId): Payment
    {
        return DB::transaction(function () use ($payload, $userId) {
            $passenger = Passenger::query()->findOrFail((int) $payload['passenger_id']);
            $tripId = (int) ($payload['trip_id'] ?? $passenger->trip_id);

            $payment = Payment::create([
                'passenger_id' => $passenger->id,
                'trip_id' => $tripId,
                'date' => $payload['date'] ?? now()->toDateString(),
                'method' => PaymentMethod::CASH->value,
                'amount_total' => $payload['amount'],
                'created_by' => $userId,
                'notes' => $payload['reason'] ?? null,
            ]);

            PaymentDetail::create([
                'payment_id' => $payment->id,
                'coupon_id' => null,
                'kind' => 'COUPON_MANUAL',
                'amount' => $payload['amount'],
            ]);

            AccountMovement::create([
                'passenger_id' => $passenger->id,
                'trip_id' => $tripId,
                'date' => $payment->date,
                'type' => AccountMovementType::CUOTA->value,
                'amount' => $payload['amount'],
                'payment_id' => $payment->id,
                'notes' => $payload['reason'] ?? null,
                'created_by' => $userId,
            ]);

            $category = CashCategory::query()->firstOrCreate(['name' => 'Cobro de cupón']);

            CashMovement::create([
                'date' => $payment->date,
                'type' => 'INCOME',
                'category_id' => $category->id,
                'amount' => $payload['amount'],
                'method' => PaymentMethod::CASH->value,
                'cash_box' => 'CASH',
                'detail' => $payload['detail'] ?? 'Cobro de cupón',
                'attachment_path' => null,
                'created_by' => $userId,
            ]);

            return $payment;
        });
    }
}
