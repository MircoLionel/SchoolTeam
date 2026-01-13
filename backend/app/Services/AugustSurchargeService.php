<?php

namespace App\Services;

use App\Enums\AccountMovementType;
use App\Models\AccountMovement;
use App\Models\Budget;
use App\Models\Passenger;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AugustSurchargeService
{
    public function apply(int $passengerId, int $tripId, int $userId): AccountMovement
    {
        $monthThreshold = Config::get('schoolteam.august.month_threshold', 8);
        if ((int) now()->format('n') < $monthThreshold) {
            throw ValidationException::withMessages(['date' => 'El recargo solo se aplica a partir de agosto.']);
        }

        $existing = AccountMovement::where('passenger_id', $passengerId)
            ->where('trip_id', $tripId)
            ->where('type', AccountMovementType::RECARGO->value)
            ->first();

        if ($existing) {
            throw ValidationException::withMessages(['recargo' => 'El recargo ya fue aplicado.']);
        }

        $hasPayments = AccountMovement::where('passenger_id', $passengerId)
            ->where('trip_id', $tripId)
            ->where('type', AccountMovementType::CUOTA->value)
            ->exists();

        if ($hasPayments) {
            throw ValidationException::withMessages(['recargo' => 'El pasajero ya tiene pagos registrados.']);
        }

        $budget = Budget::where('trip_id', $tripId)->latest('version')->firstOrFail();
        $passenger = Passenger::findOrFail($passengerId);
        $percentage = $passenger->passenger_type->percentage ?? 100;
        $total = round($budget->base_price_100 * ($percentage / 100), 2);
        $pct = Config::get('schoolteam.august.surcharge_pct', 5);
        $amount = round($total * ($pct / 100), 2);

        return DB::transaction(function () use ($passengerId, $tripId, $userId, $amount) {
            return AccountMovement::create([
                'passenger_id' => $passengerId,
                'trip_id' => $tripId,
                'date' => now()->toDateString(),
                'type' => AccountMovementType::RECARGO->value,
                'amount' => $amount,
                'payment_id' => null,
                'notes' => 'Recargo Agosto',
                'created_by' => $userId,
            ]);
        });
    }
}
