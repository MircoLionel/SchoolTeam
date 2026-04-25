<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Passenger;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class PassengerController extends Controller
{
    public function index(Request $request)
    {
        $query = Passenger::query()->with(['trip', 'school', 'grade', 'shift', 'guardian', 'passenger_type']);

        if ($request->filled('trip_id')) {
            $query->where('trip_id', $request->integer('trip_id'));
        }

        return response()->json($query->latest('id')->get());
    }

    public function store(Request $request)
    {
        try {
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

            $passenger = DB::transaction(function () use ($validated, $guardianId, $passengerTypeId, $fullName, $trip) {
                return Passenger::query()->create([
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
            });

            $passengerCount = Passenger::query()->count();

            Log::info('PassengerController@store pasajero creado en passengers.', [
                'created_passenger' => $passenger->toArray(),
                'passengers_count' => $passengerCount,
            ]);

            return response()->json($passenger->load(['trip', 'school', 'grade', 'shift', 'guardian', 'passenger_type']), 201);
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
        return response()->json($passenger->load(['trip', 'school', 'grade', 'shift', 'guardian', 'passenger_type']));
    }

    public function update(Request $request, Passenger $passenger)
    {
        $data = $request->validate([
            'trip_id' => ['sometimes', 'integer', 'exists:trips,id'],
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'grade_id' => ['sometimes', 'integer', 'exists:grades,id'],
            'shift_id' => ['sometimes', 'integer', 'exists:shifts,id'],
            'guardian_id' => ['sometimes', 'integer', 'exists:guardians,id'],
            'passenger_type_id' => ['sometimes', 'integer', 'exists:passenger_types,id'],
            'full_name' => ['sometimes', 'string', 'max:255'],
            'dni' => ['sometimes', 'string', 'max:50'],
            'birthdate' => ['nullable', 'date'],
            'sex' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $passenger->update($data);

        return response()->json($passenger->load(['trip', 'school', 'grade', 'shift', 'guardian', 'passenger_type']));
    }

    public function destroy(Passenger $passenger)
    {
        $passenger->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
