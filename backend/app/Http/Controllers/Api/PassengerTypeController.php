<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PassengerType;
use Illuminate\Http\Request;

class PassengerTypeController extends Controller
{
    public function index()
    {
        $types = PassengerType::query()
            ->orderBy('name')
            ->get();

        return response()->json($types);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $type = PassengerType::create($data);

        return response()->json($type, 201);
    }

    public function show(int $id)
    {
        $type = PassengerType::findOrFail($id);

        return response()->json($type);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $type = PassengerType::findOrFail($id);
        $type->update($data);

        return response()->json($type);
    }

    public function destroy(int $id)
    {
        $type = PassengerType::findOrFail($id);
        $type->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
