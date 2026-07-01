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
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
            'all' => ['nullable', 'boolean'],
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

        $summary = $this->buildSummary(clone $query);

        $page = (int) ($data['page'] ?? 1);
        $perPage = (int) ($data['per_page'] ?? 100);
        $showAll = (bool) ($data['all'] ?? false);
        $total = (clone $query)->count();

        $movementsQuery = $query->latest('id');
        if (! $showAll) {
            $movementsQuery
                ->forPage($page, $perPage);
        }

        $movements = $movementsQuery->get()
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

        return response()->json([
            'data' => $movements,
            'meta' => [
                'page' => $showAll ? 1 : $page,
                'per_page' => $showAll ? $total : $perPage,
                'total' => $total,
                'has_more' => $showAll ? false : ($page * $perPage) < $total,
                'all' => $showAll,
            ],
            'summary' => $summary,
        ]);
    }

    private function buildSummary($query): array
    {
        $rows = $query
            ->selectRaw("
                COALESCE(cash_movements.category_id, 0) as category_id,
                COALESCE(cash_categories.name, 'Sin categoría') as category_name,
                cash_movements.type,
                COALESCE(cash_movements.cash_box, CASE WHEN cash_movements.method = 'TRANSFER' THEN 'BANK' ELSE 'CASH' END) as resolved_cash_box,
                SUM(cash_movements.amount) as total
            ")
            ->leftJoin('cash_categories', 'cash_categories.id', '=', 'cash_movements.category_id')
            ->groupByRaw("
                COALESCE(cash_movements.category_id, 0),
                COALESCE(cash_categories.name, 'Sin categoría'),
                cash_movements.type,
                COALESCE(cash_movements.cash_box, CASE WHEN cash_movements.method = 'TRANSFER' THEN 'BANK' ELSE 'CASH' END)
            ")
            ->get();

        $summary = [
            'incomes_cash' => 0.0,
            'incomes_bank' => 0.0,
            'expenses_cash' => 0.0,
            'expenses_bank' => 0.0,
            'total_incomes' => 0.0,
            'total_expenses' => 0.0,
            'balance' => 0.0,
            'categories' => [],
        ];

        $categories = [];
        foreach ($rows as $row) {
            $amount = (float) $row->total;
            $isBank = $row->resolved_cash_box === 'BANK';

            if ($row->type === 'INCOME') {
                $summary[$isBank ? 'incomes_bank' : 'incomes_cash'] += $amount;
                $summary['total_incomes'] += $amount;
            }

            if ($row->type === 'EXPENSE') {
                $summary[$isBank ? 'expenses_bank' : 'expenses_cash'] += $amount;
                $summary['total_expenses'] += $amount;
                $categoryId = (int) $row->category_id;
                $categories[$categoryId] = [
                    'category_id' => $categoryId,
                    'category_name' => $row->category_name,
                    'amount' => ($categories[$categoryId]['amount'] ?? 0) + $amount,
                ];
            }
        }

        $summary['balance'] = $summary['total_incomes'] - $summary['total_expenses'];
        $summary['categories'] = array_values($categories);

        return $summary;
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
