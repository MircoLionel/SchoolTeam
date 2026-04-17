<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckbookPdfRenderRequest;
use App\Http\Requests\CheckbookRequest;
use App\Models\Checkbook;
use App\Services\CheckbookService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
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
        return response()->json(['pdf' => $checkbook->code . '.pdf']);
    }

    public function renderPdf(CheckbookPdfRenderRequest $request, PdfService $pdfService): BinaryFileResponse|JsonResponse
    {
        try {
            $path = $pdfService->renderCheckbookPdf($request->validated());

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
