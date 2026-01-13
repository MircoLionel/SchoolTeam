<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
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
}
