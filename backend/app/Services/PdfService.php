<?php

namespace App\Services;

class PdfService
{
    public function __construct(private readonly CheckbookPdfService $checkbookPdfService)
    {
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function renderCheckbookPdf(array $payload): string
    {
        return $this->checkbookPdfService->generate(
            $payload['header'] ?? [],
            $payload['installments'] ?? [],
            ($payload['code'] ?? 'chequera') . '.pdf'
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function renderInternalReceipt(array $payload): string
    {
        return 'storage/receipts/' . $payload['number'] . '.pdf';
    }
}
