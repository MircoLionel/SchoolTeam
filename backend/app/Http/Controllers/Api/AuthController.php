<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $this->ensureDefaultUsers();

        if (!Auth::attempt($request->validated())) {
            return response()->json(['message' => 'Credenciales inválidas.'], 401);
        }

        $user = $request->user();
        $token = $user->createToken('spa')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Sesión finalizada.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    private function ensureDefaultUsers(): void
    {
        if (User::query()->exists()) {
            return;
        }

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
            [
                'email' => 'operador@schoolteam.turismo',
                'name' => 'Operador',
                'password' => 'operador123',
                'role' => Role::OFFICE->value,
            ],
        ];

        foreach ($defaultUsers as $defaultUser) {
            User::updateOrCreate(
                ['email' => $defaultUser['email']],
                [
                    'name' => $defaultUser['name'],
                    'password' => Hash::make($defaultUser['password']),
                    'role' => $defaultUser['role'],
                    'is_active' => true,
                ]
            );
        }
    }
}
