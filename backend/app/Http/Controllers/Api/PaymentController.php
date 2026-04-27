<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CouponCollectPaymentRequest;
use App\Http\Requests\NonCashPaymentRequest;
use App\Models\AccountMovement;
use App\Models\CashMovement;
use App\Models\InternalReceipt;
use App\Models\Payment;
use App\Services\CouponCollectPaymentService;
use App\Services\NonCashPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function storeNonCash(NonCashPaymentRequest $request, NonCashPaymentService $service)
    {
        $payment = $service->register($request->validated(), $request->user()->id);

        return response()->json(['payment' => $payment]);
    }


    public function storeCouponCollect(CouponCollectPaymentRequest $request, CouponCollectPaymentService $service)
    {
        $payment = $service->register($request->validated(), $request->user()->id);

        return response()->json(['payment' => $payment]);
    }

    public function receipt(int $paymentId)
    {
        $receipt = InternalReceipt::where('payment_id', $paymentId)->firstOrFail();

        return response()->json($receipt);
    }

    public function passengerPayments(int $passengerId)
    {
        $rows = Payment::query()
            ->where('payments.passenger_id', $passengerId)
            ->join('passengers', 'passengers.id', '=', 'payments.passenger_id')
            ->join('trips', 'trips.id', '=', 'payments.trip_id')
            ->join('schools', 'schools.id', '=', 'passengers.school_id')
            ->leftJoin('users', 'users.id', '=', 'payments.created_by')
            ->leftJoin('cash_movements as cm', function ($join) {
                $join->on('cm.payment_id', '=', 'payments.id')
                    ->where('cm.type', '=', 'INCOME');
            })
            ->orderByDesc('payments.payment_date')
            ->orderByDesc('payments.id')
            ->get([
                'payments.id',
                'payments.payment_date',
                'payments.amount_total',
                'payments.method',
                'users.name as user_name',
                'schools.name as school_name',
                'trips.group_name as trip_name',
                'trips.destination as trip_destination',
                'passengers.full_name as passenger_name',
                'cm.cash_box',
            ])
            ->map(function ($row) {
                $cashBox = $row->cash_box ?? ($row->method === 'CASH' ? 'CASH' : 'BANK');

                return [
                    'id' => (int) $row->id,
                    'payment_date' => $row->payment_date,
                    'amount' => (float) $row->amount_total,
                    'method' => $row->method,
                    'cash_box' => $cashBox,
                    'user_name' => $row->user_name ?? 'Sistema',
                    'school_name' => $row->school_name,
                    'trip_name' => $row->trip_name,
                    'trip_destination' => $row->trip_destination,
                    'passenger_name' => $row->passenger_name,
                ];
            });

        return response()->json($rows->values());
    }

    public function report(Request $request)
    {
        $data = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'cash_box' => ['nullable', 'in:CASH,BANK,ALL'],
        ]);

        $query = Payment::query()
            ->join('passengers', 'passengers.id', '=', 'payments.passenger_id')
            ->join('trips', 'trips.id', '=', 'payments.trip_id')
            ->join('schools', 'schools.id', '=', 'passengers.school_id')
            ->leftJoin('users', 'users.id', '=', 'payments.created_by')
            ->leftJoin('cash_movements as cm', function ($join) {
                $join->on('cm.payment_id', '=', 'payments.id')
                    ->where('cm.type', '=', 'INCOME');
            });

        if (!empty($data['date_from'])) {
            $query->whereDate('payments.payment_date', '>=', $data['date_from']);
        }
        if (!empty($data['date_to'])) {
            $query->whereDate('payments.payment_date', '<=', $data['date_to']);
        }
        if (!empty($data['user_id'])) {
            $query->where('payments.created_by', (int) $data['user_id']);
        }
        if (($data['cash_box'] ?? 'ALL') !== 'ALL') {
            $cashBox = $data['cash_box'];
            $query->whereRaw(
                "COALESCE(cm.cash_box, CASE WHEN payments.method = 'CASH' THEN 'CASH' ELSE 'BANK' END) = ?",
                [$cashBox]
            );
        }

        $rows = $query
            ->orderBy('payments.payment_date')
            ->orderBy('users.name')
            ->orderBy('payments.id')
            ->get([
                'payments.id',
                'payments.payment_date',
                'payments.amount_total',
                'payments.method',
                'payments.created_by as user_id',
                'users.name as user_name',
                'schools.name as school_name',
                'trips.group_name as trip_name',
                'trips.destination as trip_destination',
                'passengers.full_name as passenger_name',
                'cm.cash_box',
            ])
            ->map(function ($row) {
                $cashBox = $row->cash_box ?? ($row->method === 'CASH' ? 'CASH' : 'BANK');
                return [
                    'id' => (int) $row->id,
                    'date' => $row->payment_date,
                    'amount' => (float) $row->amount_total,
                    'method' => $row->method,
                    'cash_box' => $cashBox,
                    'user_id' => (int) $row->user_id,
                    'user_name' => $row->user_name ?? 'Sistema',
                    'school_name' => $row->school_name,
                    'trip_name' => $row->trip_name,
                    'trip_destination' => $row->trip_destination,
                    'passenger_name' => $row->passenger_name,
                ];
            });

        return response()->json($rows->values());
    }

    public function destroy(Request $request, Payment $payment)
    {
        if ($request->user()?->role === 'READONLY') {
            return response()->json(['message' => 'No autorizado para eliminar pagos.'], 403);
        }

        DB::transaction(function () use ($payment) {
            AccountMovement::query()->where('payment_id', $payment->id)->delete();
            CashMovement::query()->where('payment_id', $payment->id)->delete();
            $payment->delete();
        });

        return response()->json(['message' => 'Pago eliminado correctamente.']);
    }
}
