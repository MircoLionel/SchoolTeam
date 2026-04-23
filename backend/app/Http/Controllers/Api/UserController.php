<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private const ADMIN_USER_FIELDS = [
        'id',
        'name',
        'email',
        'role',
        'is_active',
        'password_recovery',
        'created_at',
    ];

    public function index()
    {
        return response()->json(
            User::query()
                ->select(self::ADMIN_USER_FIELDS)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'max:120'],
            'role' => ['required', Rule::in(array_column(Role::cases(), 'value'))],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $password = $validated['password'];

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($password),
            'password_recovery' => $password,
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($user->only(self::ADMIN_USER_FIELDS), 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(array_column(Role::cases(), 'value'))],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user->update($validated);

        return response()->json($user->only(self::ADMIN_USER_FIELDS));
    }
}
