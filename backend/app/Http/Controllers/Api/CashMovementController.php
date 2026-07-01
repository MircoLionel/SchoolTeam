<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashCategory;
use App\Models\CashMovement;
use Illuminate\Http\Request;

class CashMovementController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:cash_categories,id'],
            'cash_box' => ['nullable', 'in:CASH,BANK,ALL'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        $query = CashMovement::query()->with('category');

        if (! empty($data['category_id'])) {
            $query->where('category_id', (int) $data['category_id']);
        }

        if (($data['cash_box'] ?? 'ALL') !== 'ALL') {
            $cashBox = $data['cash_box'];
            $query->where(function ($query) use ($cashBox) {
                $query->where('cash_box', $cashBox);

                if ($cashBox === 'CASH') {
                    $query->orWhere(function ($query) {
                        $query->whereNull('cash_box')
                            ->where(function ($query) {
                                $query->where('method', 'CASH')
                                    ->orWhereNull('method');
                            });
                    });
                }
            });
        }

        if (! empty($data['date_from'])) {
            $query->whereDate('date', '>=', $data['date_from']);
        }

        if (! empty($data['date_to'])) {
            $query->whereDate('date', '<=', $data['date_to']);
        }

        $movements = $query->latest('id')->get()
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

    public function categories()
    {
        return response()->json(
            CashCategory::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (CashCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                ])
                ->values()
        );
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
