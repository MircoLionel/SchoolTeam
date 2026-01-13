<?php

namespace Tests\Feature;

use App\Enums\CouponStatus;
use App\Models\Coupon;
use App\Services\CouponCollectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CouponCollectTest extends TestCase
{
    use RefreshDatabase;

    public function test_collect_coupon_creates_payment_and_movements(): void
    {
        DB::table('schools')->insert(['id' => 1, 'name' => 'Colegio Demo', 'created_at' => now(), 'updated_at' => now()]);
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
            'year' => 2025,
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
            'full_name' => 'Juan Perez',
            'dni' => '12345678',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $planId = DB::table('installment_plans')->insertGetId([
            'passenger_id' => $passengerId,
            'trip_id' => $tripId,
            'count' => 1,
            'total' => 10000,
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $checkbookId = DB::table('checkbooks')->insertGetId([
            'passenger_id' => $passengerId,
            'trip_id' => $tripId,
            'plan_id' => $planId,
            'code' => 'CHK-2025-TEST',
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $couponId = DB::table('coupons')->insertGetId([
            'checkbook_id' => $checkbookId,
            'installment_number' => 1,
            'amount_printed' => 10000,
            'barcode_value' => 'CUP-TEST',
            'status' => 'ISSUED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $coupon = Coupon::findOrFail($couponId);
        $service = new CouponCollectionService();
        $payment = $service->collect($coupon, 10000, null, 1, '127.0.0.1');

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'amount_total' => 10000]);
        $this->assertDatabaseHas('payment_details', ['payment_id' => $payment->id, 'coupon_id' => $couponId]);
        $this->assertDatabaseHas('account_movements', ['payment_id' => $payment->id, 'type' => 'CUOTA']);
        $this->assertDatabaseHas('coupons', ['id' => $couponId, 'status' => CouponStatus::COLLECTED->value]);
    }
}
