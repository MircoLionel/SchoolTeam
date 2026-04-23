<?php

namespace App\Http\Middleware;

use Closure;
use BackedEnum;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role)
    {
        $currentRole = $request->user()?->role;
        $currentRoleValue = $currentRole instanceof BackedEnum
            ? $currentRole->value
            : $currentRole;

        if ($currentRoleValue !== $role) {
            return response()->json(['message' => 'Acceso denegado.'], 403);
        }

        return $next($request);
    }
}
