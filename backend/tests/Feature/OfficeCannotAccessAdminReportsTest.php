<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OfficeCannotAccessAdminReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_office_cannot_access_cashbox_report(): void
    {
        $user = User::create([
            'name' => 'Oficina',
            'email' => 'office@schoolteam.turismo',
            'password' => bcrypt('secret'),
            'role' => 'OFFICE',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/reports/cashbox')->assertStatus(403);
    }
}
