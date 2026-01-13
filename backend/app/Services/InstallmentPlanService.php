<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\Installment;
use App\Models\InstallmentPlan;
use App\Models\Passenger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InstallmentPlanService
{
    public function generate(int $passengerId, int $tripId, int $count, int $createdBy): InstallmentPlan
    {
        if ($count < 1 || $count > 12) {
            throw ValidationException::withMessages(['count' => 'La cantidad de cuotas debe ser entre 1 y 12.']);
        }

        $passenger = Passenger::findOrFail($passengerId);
        $budget = Budget::where('trip_id', $tripId)->latest('version')->firstOrFail();
        $percentage = $passenger->passenger_type->percentage ?? 100;
        $total = round($budget->base_price_100 * ($percentage / 100), 2);

        return DB::transaction(function () use ($passengerId, $tripId, $count, $total, $createdBy) {
            $plan = InstallmentPlan::create([
                'passenger_id' => $passengerId,
                'trip_id' => $tripId,
                'count' => $count,
                'total' => $total,
                'created_by' => $createdBy,
            ]);

            $amount = round($total / $count, 2);
            for ($i = 1; $i <= $count; $i++) {
                Installment::create([
                    'plan_id' => $plan->id,
                    'number' => $i,
                    'amount_planned' => $amount,
                    'status' => 'PENDING',
                ]);
            }

            return $plan;
        });
    }

    public function updateInstallments(InstallmentPlan $plan, array $amounts): void
    {
        $sum = array_sum($amounts);
        if (round($sum, 2) !== round($plan->total, 2)) {
            throw ValidationException::withMessages(['amounts' => 'La suma de cuotas debe coincidir con el total.']);
        }

        foreach ($amounts as $number => $amount) {
            Installment::where('plan_id', $plan->id)
                ->where('number', $number)
                ->update(['amount_planned' => $amount]);
        }
    }
}
