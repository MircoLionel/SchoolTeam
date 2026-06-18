<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Installment;
use App\Models\InstallmentPlan;
use App\Models\Checkbook;
use App\Models\Passenger;
use App\Models\PassengerType;
use App\Models\Payment;
use App\Models\Trip;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class PassengerController extends Controller
{
    public function index(Request $request)
    {
        $query = Passenger::query()->with(['trip.latestBudget', 'school', 'grade', 'shift', 'guardian', 'passenger_type']);

        if ($request->filled('trip_id')) {
            $query->where('trip_id', $request->integer('trip_id'));
        }

        $passengers = $query->latest('id')->get();

        return response()->json($this->serializePassengers($passengers));
    }

    public function store(Request $request)
    {
        try {
            $responsible = $request->input('responsible', []);
            if (is_array($responsible)) {
                foreach (['email', 'address', 'city'] as $field) {
                    if (array_key_exists($field, $responsible) && trim((string) $responsible[$field]) === '') {
                        $responsible[$field] = null;
                    }
                }
                $request->merge(['responsible' => $responsible]);
            }

            $payload = $request->all();

            Log::info('PassengerController@store payload recibido.', [
                'payload' => $payload,
                'connection' => config('database.default'),
                'database' => config('database.connections.' . config('database.default') . '.database'),
            ]);

            $validated = $request->validate([
                'trip_id' => ['required', 'integer', 'exists:trips,id'],
                'school_id' => ['required', 'integer', 'exists:schools,id'],
                'grade_id' => ['nullable', 'integer', 'exists:grades,id'],
                'shift_id' => ['required', 'integer', 'exists:shifts,id'],
                'passenger_type_id' => ['nullable', 'integer', 'exists:passenger_types,id'],
                'guardian_id' => ['nullable', 'integer', 'exists:guardians,id'],

                'full_name' => ['nullable', 'string', 'max:255'],
                'passenger_name' => ['nullable', 'string', 'max:255'],
                'passenger_last_name' => ['nullable', 'string', 'max:255'],
                'dni' => ['nullable', 'string', 'max:50'],
                'passenger_dni' => ['nullable', 'string', 'max:50'],
                'birthdate' => ['nullable', 'date'],
                'passenger_birth_date' => ['nullable', 'date'],
                'sex' => ['nullable', 'string', 'max:50'],
                'address' => ['nullable', 'string', 'max:255'],
                'locality' => ['nullable', 'string', 'max:255'],
                'province' => ['nullable', 'string', 'max:255'],
                'postal_code' => ['nullable', 'string', 'max:50'],
                'phone' => ['nullable', 'string', 'max:100'],
                'email' => ['nullable', 'email', 'max:255'],

                'responsible' => ['nullable', 'array'],
                'responsible.name' => ['nullable', 'string', 'max:255'],
                'responsible.last_name' => ['nullable', 'string', 'max:255'],
                'responsible.dni' => ['nullable', 'string', 'max:50'],
                'responsible.birth_date' => ['nullable', 'date'],
                'responsible.email' => ['nullable', 'email', 'max:255'],
                'responsible.phone' => ['nullable', 'string', 'max:100'],
                'responsible.address' => ['nullable', 'string', 'max:255'],
                'responsible.city' => ['nullable', 'string', 'max:255'],
                'trip_value' => ['nullable', 'numeric', 'min:0'],
                'num_installments' => ['nullable', 'integer', 'min:1', 'max:24'],
                'installments' => ['nullable', 'array'],
                'installments.*' => ['nullable', 'numeric', 'min:0'],
            ]);

            Log::info('PassengerController@store datos validados.', [
                'validated' => $validated,
            ]);

            $trip = Trip::query()->findOrFail($validated['trip_id']);
            $guardianId = $validated['guardian_id'] ?? null;

            if (!$guardianId) {
                $responsible = $validated['responsible'] ?? [];
                $guardianName = trim((string) (($responsible['name'] ?? '') . ' ' . ($responsible['last_name'] ?? '')));

                $guardian = Guardian::query()->create([
                    'full_name' => $guardianName !== '' ? $guardianName : 'Responsable sin nombre',
                    'dni_type' => 'DNI',
                    'dni' => (string) ($responsible['dni'] ?? 'SIN_DNI'),
                    'birthdate' => $responsible['birth_date'] ?? null,
                    'sex' => null,
                    'address' => $responsible['address'] ?? null,
                    'locality' => $responsible['city'] ?? null,
                    'province' => null,
                    'postal_code' => null,
                    'phone' => $responsible['phone'] ?? null,
                    'email' => $responsible['email'] ?? null,
                ]);

                $guardianId = $guardian->id;
            }

            $passengerTypeId = $validated['passenger_type_id']
                ?? PassengerType::query()->firstOrCreate(
                    ['name' => 'Alumno 100%'],
                    ['percentage' => 100]
                )->id;

            $fullName = trim((string) ($validated['full_name']
                ?? (($validated['passenger_name'] ?? '') . ' ' . ($validated['passenger_last_name'] ?? ''))));

            $passenger = DB::transaction(function () use ($validated, $guardianId, $passengerTypeId, $fullName, $trip, $request) {
                $createdPassenger = Passenger::query()->create([
                    'trip_id' => $validated['trip_id'],
                    'school_id' => $validated['school_id'],
                    'grade_id' => $validated['grade_id'] ?? $trip->grade_id,
                    'shift_id' => $validated['shift_id'],
                    'guardian_id' => $guardianId,
                    'passenger_type_id' => $passengerTypeId,
                    'full_name' => $fullName !== '' ? $fullName : 'Pasajero sin nombre',
                    'dni' => $validated['dni'] ?? $validated['passenger_dni'] ?? 'SIN_DNI',
                    'birthdate' => $validated['birthdate'] ?? $validated['passenger_birth_date'] ?? null,
                    'sex' => $validated['sex'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'locality' => $validated['locality'] ?? null,
                    'province' => $validated['province'] ?? null,
                    'postal_code' => $validated['postal_code'] ?? null,
                    'phone' => $validated['phone'] ?? null,
                    'email' => $validated['email'] ?? null,
                ]);

                $this->upsertPassengerFinancials($createdPassenger, $validated, (int) $request->user()->id);

                return $createdPassenger;
            });

            $passengerCount = Passenger::query()->count();

            Log::info('PassengerController@store pasajero creado en passengers.', [
                'created_passenger' => $passenger->toArray(),
                'passengers_count' => $passengerCount,
            ]);

            $passenger->load(['trip.latestBudget', 'school', 'grade', 'shift', 'guardian', 'passenger_type']);

            return response()->json($this->serializePassenger($passenger), 201);
        } catch (ValidationException $e) {
            Log::error('Passenger create failed by validation', [
                'error' => $e->getMessage(),
                'errors' => $e->errors(),
            ]);

            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            Log::error('Passenger create failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show(Passenger $passenger)
    {
        $passenger->load(['trip.latestBudget', 'school', 'grade', 'shift', 'guardian', 'passenger_type']);

        return response()->json($this->serializePassenger($passenger));
    }

    public function update(Request $request, Passenger $passenger)
    {
        $responsible = $request->input('responsible', []);
        if (is_array($responsible)) {
            foreach (['email', 'address', 'city'] as $field) {
                if (array_key_exists($field, $responsible) && trim((string) $responsible[$field]) === '') {
                    $responsible[$field] = null;
                }
            }
            $request->merge(['responsible' => $responsible]);
        }

        $data = $request->validate([
            'trip_id' => ['sometimes', 'integer', 'exists:trips,id'],
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'grade_id' => ['nullable', 'integer', 'exists:grades,id'],
            'shift_id' => ['sometimes', 'integer', 'exists:shifts,id'],
            'guardian_id' => ['sometimes', 'integer', 'exists:guardians,id'],
            'passenger_type_id' => ['sometimes', 'integer', 'exists:passenger_types,id'],
            'full_name' => ['sometimes', 'string', 'max:255'],
            'passenger_name' => ['sometimes', 'string', 'max:255'],
            'passenger_last_name' => ['sometimes', 'string', 'max:255'],
            'dni' => ['sometimes', 'string', 'max:50'],
            'passenger_dni' => ['sometimes', 'string', 'max:50'],
            'birthdate' => ['nullable', 'date'],
            'passenger_birth_date' => ['nullable', 'date'],
            'sex' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'trip_value' => ['sometimes', 'numeric', 'min:0'],
            'num_installments' => ['sometimes', 'integer', 'min:1', 'max:24'],
            'installments' => ['sometimes', 'array'],
            'installments.*' => ['nullable', 'numeric', 'min:0'],
            'responsible' => ['sometimes', 'array'],
            'responsible.name' => ['nullable', 'string', 'max:255'],
            'responsible.last_name' => ['nullable', 'string', 'max:255'],
            'responsible.dni' => ['nullable', 'string', 'max:50'],
            'responsible.birth_date' => ['nullable', 'date'],
            'responsible.email' => ['nullable', 'email', 'max:255'],
            'responsible.phone' => ['nullable', 'string', 'max:100'],
            'responsible.address' => ['nullable', 'string', 'max:255'],
            'responsible.city' => ['nullable', 'string', 'max:255'],
        ]);

        if (!array_key_exists('full_name', $data) && (array_key_exists('passenger_name', $data) || array_key_exists('passenger_last_name', $data))) {
            $fullName = trim((string) (($data['passenger_name'] ?? '') . ' ' . ($data['passenger_last_name'] ?? '')));
            if ($fullName !== '') {
                $data['full_name'] = $fullName;
            }
        }
        if (!array_key_exists('dni', $data) && array_key_exists('passenger_dni', $data)) {
            $data['dni'] = $data['passenger_dni'];
        }
        if (!array_key_exists('birthdate', $data) && array_key_exists('passenger_birth_date', $data)) {
            $data['birthdate'] = $data['passenger_birth_date'];
        }

        $financialPayload = array_intersect_key($data, array_flip(['trip_value', 'num_installments', 'installments']));
        $passengerData = array_diff_key($data, $financialPayload, ['responsible' => true, 'passenger_name' => true, 'passenger_last_name' => true, 'passenger_dni' => true, 'passenger_birth_date' => true]);

        $passenger->update($passengerData);

        if (array_key_exists('responsible', $data) && is_array($data['responsible'])) {
            $responsibleData = $data['responsible'];
            $guardian = $passenger->guardian;
            if ($guardian) {
                $fullName = trim((string) (($responsibleData['name'] ?? '') . ' ' . ($responsibleData['last_name'] ?? '')));
                $guardian->update([
                    'full_name' => $fullName !== '' ? $fullName : $guardian->full_name,
                    'dni' => $responsibleData['dni'] ?? $guardian->dni,
                    'birthdate' => $responsibleData['birth_date'] ?? $guardian->birthdate,
                    'email' => $responsibleData['email'] ?? null,
                    'phone' => $responsibleData['phone'] ?? $guardian->phone,
                    'address' => $responsibleData['address'] ?? null,
                    'locality' => $responsibleData['city'] ?? null,
                ]);
            }
        }

        if ($financialPayload !== []) {
            $this->upsertPassengerFinancials($passenger, $financialPayload, (int) $request->user()->id);
        }

        $passenger->load(['trip.latestBudget', 'school', 'grade', 'shift', 'guardian', 'passenger_type']);

        return response()->json($this->serializePassenger($passenger));
    }

    public function destroy(Passenger $passenger)
    {
        $passenger->delete();

        return response()->json(['message' => 'Eliminado']);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function serializePassengers(Collection $passengers): array
    {
        return $passengers->map(fn (Passenger $passenger) => $this->serializePassenger($passenger))->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializePassenger(Passenger $passenger): array
    {
        $plan = InstallmentPlan::query()
            ->where('passenger_id', $passenger->id)
            ->where('trip_id', $passenger->trip_id)
            ->latest('id')
            ->first();

        $installments = $plan
            ? Installment::query()
                ->where('plan_id', $plan->id)
                ->orderBy('number')
                ->pluck('amount_planned')
                ->map(fn ($amount) => (float) $amount)
                ->all()
            : [];

        $total = $plan?->total !== null
            ? (float) $plan->total
            : (float) ($passenger->trip?->latestBudget?->base_price_100 ?? 0);

        $paid = (float) Payment::query()
            ->where('passenger_id', $passenger->id)
            ->where('trip_id', $passenger->trip_id)
            ->where('status', 'POSTED')
            ->sum('amount_total');

        $lastModifiedAt = max(
            strtotime((string) $passenger->updated_at),
            $plan?->updated_at ? strtotime((string) $plan->updated_at) : 0
        );

        $latestCheckbook = Checkbook::query()
            ->with('printedBy:id,name')
            ->where('passenger_id', $passenger->id)
            ->latest('id')
            ->first();

        return array_merge($passenger->toArray(), [
            'trip_value' => $total,
            'num_installments' => (int) ($plan?->count ?? count($installments)),
            'installments' => $installments,
            'paid_amount' => $paid,
            'balance' => $paid - $total,
            'remaining_amount' => max(0, $total - $paid),
            'last_modified_by' => $passenger->updated_by ?? null,
            'last_modified_at' => $lastModifiedAt > 0 ? date('Y-m-d H:i:s', $lastModifiedAt) : null,
            'checkbook_id' => $latestCheckbook?->id,
            'checkbook_status' => $latestCheckbook?->status,
            'checkbook_printed_at' => $latestCheckbook?->printed_at?->toDateTimeString(),
            'checkbook_printed_by' => $latestCheckbook?->printedBy?->name,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function upsertPassengerFinancials(Passenger $passenger, array $payload, int $createdBy): void
    {
        $tripValue = array_key_exists('trip_value', $payload)
            ? (float) $payload['trip_value']
            : (float) ($passenger->trip?->latestBudget?->base_price_100 ?? 0);

        $count = array_key_exists('num_installments', $payload)
            ? max(1, (int) $payload['num_installments'])
            : 8;

        $incomingInstallments = array_values(array_map(
            fn ($amount) => (float) $amount,
            array_filter((array) ($payload['installments'] ?? []), fn ($value) => $value !== null)
        ));

        if ($incomingInstallments === []) {
            $baseAmount = $count > 0 ? round($tripValue / $count, 2) : 0;
            $incomingInstallments = array_fill(0, $count, $baseAmount);
            if ($incomingInstallments !== []) {
                $incomingInstallments[$count - 1] = round($tripValue - array_sum(array_slice($incomingInstallments, 0, $count - 1)), 2);
            }
        }

        $count = max($count, count($incomingInstallments));

        $plan = InstallmentPlan::query()
            ->where('passenger_id', $passenger->id)
            ->where('trip_id', $passenger->trip_id)
            ->latest('id')
            ->first();

        if (! $plan) {
            $plan = InstallmentPlan::query()->create([
                'passenger_id' => $passenger->id,
                'trip_id' => $passenger->trip_id,
                'count' => $count,
                'total' => $tripValue,
                'created_by' => $createdBy,
            ]);
        } else {
            $plan->update([
                'count' => $count,
                'total' => $tripValue,
            ]);
            Installment::query()->where('plan_id', $plan->id)->delete();
        }

        foreach ($incomingInstallments as $index => $amount) {
            Installment::query()->create([
                'plan_id' => $plan->id,
                'number' => $index + 1,
                'amount_planned' => $amount,
                'status' => 'PENDING',
            ]);
        }
    }
}
