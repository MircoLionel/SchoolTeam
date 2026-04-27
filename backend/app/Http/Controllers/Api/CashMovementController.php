<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashCategory;
use App\Models\CashMovement;
use Illuminate\Http\Request;

class CashMovementController extends Controller
{
    public function index()
    {
        $movements = CashMovement::query()
            ->with('category')
            ->latest('id')
            ->get()
            ->map(fn (CashMovement $movement) => [
                'id' => $movement->id,
                'date' => optional($movement->date)->toDateString(),
                'type' => $movement->type,
                'amount' => (float) $movement->amount,
                'method' => $movement->method,
                'cash_box' => $movement->cash_box,
                'detail' => $movement->detail,
                'category_id' => $movement->category_id,
                'category_name' => $movement->category?->name,
                'payment_id' => $movement->payment_id,
                'created_at' => optional($movement->created_at)?->toISOString(),
            ]);

        return response()->json($movements);
    }

    public function storeExpense(Request $request)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string'],
            'category_name' => ['nullable', 'string', 'max:255'],
            'cash_box' => ['nullable', 'in:CASH,BANK'],
            'date' => ['nullable', 'date'],
        ]);

        $category = CashCategory::query()->firstOrCreate([
            'name' => $data['category_name'] ?? 'Sin categoría',
        ]);

        $movement = CashMovement::query()->create([
            'date' => $data['date'] ?? now()->toDateString(),
            'type' => 'EXPENSE',
            'category_id' => $category->id,
            'amount' => $data['amount'],
            'method' => null,
            'cash_box' => $data['cash_box'] ?? 'CASH',
            'detail' => $data['description'] ?? 'Sin detalle',
            'attachment_path' => null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['movement' => $movement->load('category')], 201);
    }

    public function destroy(CashMovement $cashMovement)
    {
        if ($cashMovement->type !== 'EXPENSE') {
            return response()->json(['message' => 'Solo se pueden eliminar egresos.'], 422);
        }

        $cashMovement->delete();

        return response()->json(['message' => 'Egreso eliminado']);
    }

    public function reset()
    {
        CashMovement::query()->delete();

        return response()->json(['message' => 'Caja reseteada']);
    }
}
