<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CashMovementFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_movements_can_be_filtered_by_category_cash_box_and_dates(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Administración',
            'email' => 'admin-caja@example.com',
            'password' => bcrypt('secret'),
            'role' => 'ADMIN',
            'is_active' => true,
        ]));

        $officeCategoryId = DB::table('cash_categories')->insertGetId(['name' => 'Gastos De Oficina']);
        $fuelCategoryId = DB::table('cash_categories')->insertGetId(['name' => 'Combustible']);

        DB::table('cash_movements')->insert([
            [
                'date' => '2024-01-10',
                'type' => 'EXPENSE',
                'category_id' => $officeCategoryId,
                'amount' => 1000,
                'method' => null,
                'cash_box' => 'CASH',
                'detail' => 'Papelería histórica',
                'attachment_path' => null,
                'created_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'date' => '2026-06-10',
                'type' => 'EXPENSE',
                'category_id' => $officeCategoryId,
                'amount' => 2000,
                'method' => null,
                'cash_box' => 'BANK',
                'detail' => 'Sillas',
                'attachment_path' => null,
                'created_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'date' => '2026-06-12',
                'type' => 'EXPENSE',
                'category_id' => $fuelCategoryId,
                'amount' => 3000,
                'method' => null,
                'cash_box' => 'CASH',
                'detail' => 'Nafta',
                'attachment_path' => null,
                'created_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->getJson('/api/cash-movements')
            ->assertOk()
            ->assertJsonCount(3);

        $this->getJson("/api/cash-movements?category_id={$officeCategoryId}&cash_box=BANK&date_from=2026-06-01&date_to=2026-06-30")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.detail', 'Sillas')
            ->assertJsonPath('0.category_name', 'Gastos De Oficina')
            ->assertJsonPath('0.cash_box', 'BANK');
    }

    public function test_cash_categories_are_returned_from_backend(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Administración',
            'email' => 'admin-categorias-caja@example.com',
            'password' => bcrypt('secret'),
            'role' => 'ADMIN',
            'is_active' => true,
        ]));

        DB::table('cash_categories')->insert([
            ['name' => 'Gastos De Oficina'],
            ['name' => 'Viáticos'],
        ]);

        $this->getJson('/api/cash-categories')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Gastos De Oficina'])
            ->assertJsonFragment(['name' => 'Viáticos']);
    }
}
