<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckbookPdfRenderRequest;
use App\Http\Requests\CheckbookRequest;
use App\Models\AuditLog;
use App\Models\Checkbook;
use App\Services\CheckbookService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class CheckbookController extends Controller
{
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
        Log::info('CHECKBOOK REAL ROUTE HIT', [
            'endpoint' => 'downloadPdf',
            'checkbook_id' => $checkbook->id,
            'code' => $checkbook->code,
        ]);

        return response()->json(['pdf' => $checkbook->code . '.pdf']);
    }

    public function renderPdf(CheckbookPdfRenderRequest $request, PdfService $pdfService): BinaryFileResponse|JsonResponse
    {
        try {
            $payload = $request->validated();

            Log::info('CHECKBOOK REAL ROUTE HIT', [
                'endpoint' => 'renderPdf',
                'code' => $payload['code'] ?? null,
                'installments_count' => is_array($payload['installments'] ?? null) ? count($payload['installments']) : 0,
            ]);

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
