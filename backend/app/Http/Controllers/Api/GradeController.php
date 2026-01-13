<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index()
    {
        return response()->json([]);
    }

    public function store(Request $request)
    {
        return response()->json(['message' => 'Creado'], 201);
    }

    public function show(int $id)
    {
        return response()->json(['id' => $id]);
    }

    public function update(Request $request, int $id)
    {
        return response()->json(['id' => $id, 'message' => 'Actualizado']);
    }

    public function destroy(int $id)
    {
        return response()->json(['id' => $id, 'message' => 'Eliminado']);
    }
}
