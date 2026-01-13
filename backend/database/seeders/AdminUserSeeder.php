<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@schoolteam.turismo'],
            [
                'name' => 'Admin',
                'password' => Hash::make('admin123'),
                'role' => Role::ADMIN->value,
                'is_active' => true,
            ]
        );
    }
}
