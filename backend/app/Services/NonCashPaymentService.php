<?php

namespace App\Services;

use App\Enums\AccountMovementType;
use App\Enums\PaymentMethod;
use App\Models\AccountMovement;
use App\Models\CashCategory;
use App\Models\CashMovement;
use App\Models\InternalReceipt;
use App\Models\Payment;
use App\Models\Passenger;
use App\Models\PaymentDetail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NonCashPaymentService
{
    public function register(array $payload, int $userId): Payment
    {
        return DB::transaction(function () use ($payload, $userId) {
            $passenger = Passenger::query()->findOrFail((int) $payload['passenger_id']);
            $tripId = (int) ($payload['trip_id'] ?? $passenger->trip_id);
            $method = $payload['method'] ?? PaymentMethod::TRANSFER->value;

            $payment = Payment::create([
                'passenger_id' => $passenger->id,
                'trip_id' => $tripId,
                'date' => $payload['date'] ?? now()->toDateString(),
                'payment_date' => $payload['payment_date'] ?? $payload['date'] ?? now()->toDateString(),
                'method' => $method,
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
                'passenger_id' => $passenger->id,
                'trip_id' => $tripId,
                'date' => $payment->date,
                'type' => AccountMovementType::CUOTA->value,
                'amount' => $payload['amount'],
                'payment_id' => $payment->id,
                'notes' => $payload['reference'] ?? null,
                'created_by' => $userId,
            ]);

            $category = CashCategory::query()->firstOrCreate(['name' => 'Pago no efectivo']);

            CashMovement::create([
                'date' => $payment->date,
                'type' => 'INCOME',
                'category_id' => $category->id,
                'amount' => $payload['amount'],
                'method' => $method,
                'cash_box' => 'BANK',
                'detail' => $payload['detail'] ?? 'Pago no efectivo',
                'attachment_path' => null,
                'created_by' => $userId,
                'payment_id' => $payment->id,
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
