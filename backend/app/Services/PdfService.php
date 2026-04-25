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
        $header = $payload['header'] ?? [];

        if (($payload['code'] ?? null) !== null) {
            $header['codigo'] = (string) $payload['code'];
        }

        return $this->checkbookPdfService->generate(
            $header,
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
