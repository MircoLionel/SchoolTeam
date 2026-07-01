<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VoidPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_user_can_void_payment_and_remove_its_financial_movements(): void
    {
        $user = User::create([
            'name' => 'Administración',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret'),
            'role' => 'ADMIN',
            'is_active' => true,
        ]);

        [$passengerId, $tripId] = $this->createPassenger();

        $payment = Payment::create([
            'passenger_id' => $passengerId,
            'trip_id' => $tripId,
            'date' => now()->toDateString(),
            'payment_date' => now()->toDateString(),
            'method' => 'CASH',
            'amount_total' => 1500,
            'created_by' => $user->id,
        ]);

        DB::table('account_movements')->insert([
            'passenger_id' => $passengerId,
            'trip_id' => $tripId,
            'date' => now()->toDateString(),
            'type' => 'CUOTA',
            'amount' => 1500,
            'payment_id' => $payment->id,
            'created_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $categoryId = DB::table('cash_categories')->insertGetId(['name' => 'Cobros']);
        DB::table('cash_movements')->insert([
            'date' => now()->toDateString(),
            'type' => 'INCOME',
            'category_id' => $categoryId,
            'amount' => 1500,
            'method' => 'CASH',
            'cash_box' => 'CASH',
            'detail' => 'Pago de prueba',
            'created_by' => $user->id,
            'payment_id' => $payment->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson("/api/payments/{$payment->id}")
            ->assertOk()
            ->assertJsonPath('payment.status', 'VOID')
            ->assertJsonPath('payment.voided_by_user_id', $user->id);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'VOID',
            'voided_by_user_id' => $user->id,
        ]);
        $this->assertDatabaseMissing('account_movements', ['payment_id' => $payment->id]);
        $this->assertDatabaseMissing('cash_movements', ['payment_id' => $payment->id]);
    }

    public function test_readonly_user_cannot_void_payment(): void
    {
        $readonly = User::create([
            'name' => 'Consulta',
            'email' => 'readonly@example.com',
            'password' => bcrypt('secret'),
            'role' => 'READONLY',
            'is_active' => true,
        ]);

        [$passengerId, $tripId] = $this->createPassenger();
        $payment = Payment::create([
            'passenger_id' => $passengerId,
            'trip_id' => $tripId,
            'date' => now()->toDateString(),
            'payment_date' => now()->toDateString(),
            'method' => 'CASH',
            'amount_total' => 1500,
            'created_by' => $readonly->id,
        ]);

        Sanctum::actingAs($readonly);

        $this->deleteJson("/api/payments/{$payment->id}")->assertForbidden();
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'POSTED']);
    }

    /**
     * @return array{int, int}
     */
    private function createPassenger(): array
    {
        DB::table('schools')->insert([
            'id' => 1,
            'name' => 'Colegio Demo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('grades')->insert(['id' => 1, 'name' => '6to']);
        DB::table('shifts')->insert(['id' => 1, 'name' => 'Mañana']);
        DB::table('passenger_types')->insert(['id' => 1, 'name' => 'Alumno', 'percentage' => 100]);
        DB::table('guardians')->insert([
            'id' => 1,
            'full_name' => 'Tutor',
            'dni_type' => 'DNI',
            'dni' => '11111111',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $tripId = DB::table('trips')->insertGetId([
            'school_id' => 1,
            'grade_id' => 1,
            'destination' => 'Bariloche',
            'group_name' => '6A',
            'year' => 2026,
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $passengerId = DB::table('passengers')->insertGetId([
            'trip_id' => $tripId,
            'school_id' => 1,
            'grade_id' => 1,
            'shift_id' => 1,
            'guardian_id' => 1,
            'passenger_type_id' => 1,
            'full_name' => 'Juan Pérez',
            'dni' => '12345678',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$passengerId, $tripId];
    }
}
