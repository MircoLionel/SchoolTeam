<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(
            User::query()
                ->select(['id', 'name', 'email', 'role', 'is_active', 'created_at'])
                ->orderBy('name')
                ->get()
        );
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(array_column(Role::cases(), 'value'))],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user->update($validated);

        return response()->json(
            $user->only(['id', 'name', 'email', 'role', 'is_active', 'created_at'])
        );
    }
}

