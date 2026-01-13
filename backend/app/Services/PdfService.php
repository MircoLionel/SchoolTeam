<?php

namespace App\Services;

class PdfService
{
    public function renderCheckbookPdf(array $payload): string
    {
        return 'storage/checkbooks/' . $payload['code'] . '.pdf';
    }

    public function renderInternalReceipt(array $payload): string
    {
        return 'storage/receipts/' . $payload['number'] . '.pdf';
    }
}
