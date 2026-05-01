<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckbookPdfRenderRequest;
use App\Http\Requests\CheckbookRequest;
use App\Models\AuditLog;
use App\Models\Checkbook;
use App\Models\InstallmentPlan;
use App\Services\CheckbookService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class CheckbookController extends Controller
{
    public function markPrinted(\Illuminate\Http\Request $request): JsonResponse
    {
        $validated = $request->validate([
            'passenger_id' => ['required', 'integer', 'exists:passengers,id'],
            'checkbook_id' => ['nullable', 'integer', 'exists:checkbooks,id'],
        ]);

        $checkbook = null;
        if (! empty($validated['checkbook_id'])) {
            $checkbook = Checkbook::query()
                ->where('id', (int) $validated['checkbook_id'])
                ->where('passenger_id', (int) $validated['passenger_id'])
                ->first();
        }

        if (! $checkbook) {
            $checkbook = Checkbook::query()
                ->where('passenger_id', (int) $validated['passenger_id'])
                ->latest('id')
                ->first();
        }

        if (! $checkbook) {
            $plan = InstallmentPlan::query()
                ->where('passenger_id', (int) $validated['passenger_id'])
                ->latest('id')
                ->first();

            if (! $plan) {
                return response()->json(['message' => 'No existe plan para generar/registrar la chequera.'], 422);
            }

            $checkbook = app(CheckbookService::class)->generate(
                (int) $validated['passenger_id'],
                (int) $plan->trip_id,
                (int) $plan->id
            );
        }

        $checkbook->update([
            'status' => 'PRINTED',
            'printed_at' => now(),
            'printed_by_user_id' => (int) $request->user()->id,
        ]);

        $checkbook->load('printedBy:id,name');

        return response()->json([
            'id' => $checkbook->id,
            'passenger_id' => $checkbook->passenger_id,
            'status' => $checkbook->status,
            'printed_at' => optional($checkbook->printed_at)->toDateTimeString(),
            'printed_by' => $checkbook->printedBy?->name,
            'printed_by_user_id' => $checkbook->printed_by_user_id,
        ]);
    }

    public function store(CheckbookRequest $request, CheckbookService $service)
    {
        $checkbook = $service->generate(
            $request->get('passenger_id'),
            $request->get('trip_id'),
            $request->get('plan_id')
        );

        return response()->json($checkbook, 201);
    }

    public function downloadPdf(Checkbook $checkbook)
    {
        return response()->json(['pdf' => $checkbook->code . '.pdf']);
    }

    public function renderPdf(CheckbookPdfRenderRequest $request, PdfService $pdfService): BinaryFileResponse|JsonResponse
    {
        try {
            $payload = $request->validated();
            $path = $pdfService->renderCheckbookPdf($payload);

            AuditLog::create([
                'entity' => 'checkbook_pdf',
                'entity_id' => (int) ($payload['header']['contrato'] ?? 0),
                'action' => 'PRINT',
                'before_json' => null,
                'after_json' => [
                    'code' => $payload['code'] ?? null,
                    'header' => $payload['header'] ?? [],
                    'installments_count' => is_array($payload['installments'] ?? null) ? count($payload['installments']) : 0,
                    'printed_at' => now()->toDateTimeString(),
                    'printed_by' => $request->user()?->name,
                ],
                'user_id' => (int) $request->user()->id,
                'ip' => $request->ip(),
                'created_at' => now(),
            ]);

            return response()->download($path, basename($path), [
                'Content-Type' => 'application/pdf',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'No se pudo generar la chequera PDF.',
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
