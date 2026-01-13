<?php

namespace App\Services;

use App\Enums\AccountMovementType;
use App\Models\AccountMovement;
use App\Models\InternalReceipt;
use App\Models\Payment;
use App\Models\PaymentDetail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NonCashPaymentService
{
    public function register(array $payload, int $userId): Payment
    {
        return DB::transaction(function () use ($payload, $userId) {
            $payment = Payment::create([
                'passenger_id' => $payload['passenger_id'],
                'trip_id' => $payload['trip_id'],
                'date' => $payload['date'] ?? now()->toDateString(),
                'method' => $payload['method'],
                'amount_total' => $payload['amount'],
                'created_by' => $userId,
                'notes' => $payload['reference'] ?? null,
            ]);

            PaymentDetail::create([
                'payment_id' => $payment->id,
                'coupon_id' => null,
                'kind' => 'NONCASH',
                'amount' => $payload['amount'],
            ]);

            AccountMovement::create([
                'passenger_id' => $payload['passenger_id'],
                'trip_id' => $payload['trip_id'],
                'date' => $payment->date,
                'type' => AccountMovementType::CUOTA->value,
                'amount' => $payload['amount'],
                'payment_id' => $payment->id,
                'notes' => $payload['reference'] ?? null,
                'created_by' => $userId,
            ]);

            InternalReceipt::create([
                'payment_id' => $payment->id,
                'type' => 'COMPROBANTE_X',
                'number' => 'X-' . Str::upper(Str::random(8)),
                'pdf_path' => 'receipts/' . $payment->id . '.pdf',
            ]);

            return $payment;
        });
    }
}
