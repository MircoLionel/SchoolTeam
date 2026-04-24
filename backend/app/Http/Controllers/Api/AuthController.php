<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $this->ensureDefaultUsers();

        $credentials = $request->validated();
        $user = User::query()->where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Credenciales inválidas.'], 401);
        }

        try {
            if (!Schema::hasTable('personal_access_tokens')) {
                Log::error('Login fallido: falta la tabla personal_access_tokens para Sanctum.', [
                    'email' => $credentials['email'],
                ]);

                return response()->json([
                    'message' => 'Error de configuración del servidor de autenticación.',
                ], 500);
            }

            Auth::login($user);
            $token = $user->createToken('spa')->plainTextToken;
        } catch (Throwable $exception) {
            Log::error('Error al generar token Sanctum durante login.', [
                'email' => $credentials['email'],
                'user_id' => $user->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'No se pudo iniciar sesión por un error interno.',
            ], 500);
        }

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
