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
        $defaultUsers = [
            [
                'email' => 'admin@schoolteam.turismo',
                'name' => 'Admin',
                'password' => 'admin123',
                'role' => Role::ADMIN->value,
            ],
            [
                'email' => 'mirco@schoolteam.turismo',
                'name' => 'Mirco',
                'password' => 'mirco123',
                'role' => Role::ADMIN->value,
            ],
            [
                'email' => 'ivan@schoolteam.turismo',
                'name' => 'Ivan',
                'password' => 'ivan123',
                'role' => Role::ADMIN->value,
            ],
        ];

        foreach ($defaultUsers as $defaultUser) {
            User::updateOrCreate(
                ['email' => $defaultUser['email']],
                [
                    'name' => $defaultUser['name'],
                    'password' => Hash::make($defaultUser['password']),
                    'password_recovery' => $defaultUser['password'],
                    'role' => $defaultUser['role'],
                    'is_active' => true,
                ]
            );
        }

        User::query()->where('email', 'operador@schoolteam.turismo')->delete();
    }
}
