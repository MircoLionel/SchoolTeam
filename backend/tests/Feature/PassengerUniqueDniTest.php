<?php

namespace Tests\Feature;

use App\Models\Passenger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PassengerUniqueDniTest extends TestCase
{
    use RefreshDatabase;

    public function test_unique_dni_per_trip(): void
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

        Passenger::create([
            'trip_id' => $tripId,
            'school_id' => 1,
            'grade_id' => 1,
            'shift_id' => 1,
            'guardian_id' => 1,
            'passenger_type_id' => 1,
            'full_name' => 'Juan Perez',
            'dni' => '12345678',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Passenger::create([
            'trip_id' => $tripId,
            'school_id' => 1,
            'grade_id' => 1,
            'shift_id' => 1,
            'guardian_id' => 1,
            'passenger_type_id' => 1,
            'full_name' => 'Maria Perez',
            'dni' => '12345678',
        ]);
    }
}
