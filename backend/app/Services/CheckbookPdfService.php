<?php

namespace App\Services;

use Illuminate\Support\Arr;
use RuntimeException;
use setasign\Fpdi\Fpdi;

class CheckbookPdfService
{
    /**
     * @param  array<string, mixed>  $header Datos fijos del pasajero/contrato.
     * @param  array<int, array<string, mixed>>  $installments Cuotas.
     */
    public function generate(array $header, array $installments, ?string $outputFilename = null): string
    {
        if ($installments === []) {
            throw new RuntimeException('No se recibieron cuotas para generar la chequera.');
        }

        if (! class_exists(Fpdi::class)) {
            throw new RuntimeException(
                'No está instalada la librería FPDI/FPDF. Ejecutá: composer install o composer require setasign/fpdf setasign/fpdi'
            );
        }

        $templatePath = config('checkbook_pdf.template_path');
        if (! is_string($templatePath) || ! is_file($templatePath)) {
            throw new RuntimeException("No se encontró la plantilla PDF en: {$templatePath}. Subila en backend/storage/app/templates/1,2,3 (2).pdf o definí CHECKBOOK_TEMPLATE_PATH en .env");
        }

        $couponPositions = config('checkbook_pdf.coupon_positions', []);
        if (! is_array($couponPositions) || count($couponPositions) !== 3) {
            throw new RuntimeException('La configuración coupon_positions debe tener exactamente 3 posiciones (3 cuotas por página).');
        }

        $copiesOffsetX = config('checkbook_pdf.copy_offsets_x', []);
        if (! is_array($copiesOffsetX) || $copiesOffsetX === []) {
            throw new RuntimeException('La configuración copy_offsets_x es inválida.');
        }

        $couponsPerPage = (int) config('checkbook_pdf.coupons_per_page', 3);
        if ($couponsPerPage !== 3) {
            throw new RuntimeException('La configuración coupons_per_page actualmente debe ser 3 para esta plantilla.');
        }

        $pdf = new Fpdi('P', 'mm');
        $pageCount = $pdf->setSourceFile($templatePath);
        $sourcePage = (int) config('checkbook_pdf.source_page', 1);
        if ($sourcePage < 1 || $sourcePage > $pageCount) {
            throw new RuntimeException("source_page={$sourcePage} es inválida para la plantilla ({$pageCount} páginas). ");
        }

        $templateId = $pdf->importPage($sourcePage);

        // Regla solicitada: 1-3 cuotas => 1 página, 4-6 => 2, etc.
        foreach (array_chunk($installments, 3) as $installmentsPageGroup) {
            $pdf->addPage();
            $pdf->useTemplate($templateId, 0, 0);

            foreach ($couponPositions as $couponIndex => $couponPosition) {
                $installment = $installmentsPageGroup[$couponIndex] ?? null;

                // Si no hay cuota en esta fila (última página incompleta), se deja el espacio vacío.
                if (! is_array($installment)) {
                    continue;
                }

                foreach ($copiesOffsetX as $offsetX) {
                    $slot = [
                        'x' => (float) ($couponPosition['x'] ?? 0) + (float) $offsetX,
                        'y' => (float) ($couponPosition['y'] ?? 0),
                    ];

                    $this->printInstallmentIntoSlot($pdf, $slot, $header, $installment);
                }
            }
        }

        $outputDir = config('checkbook_pdf.output_dir');
        if (! is_string($outputDir)) {
            throw new RuntimeException('La configuración output_dir de checkbook_pdf es inválida.');
        }

        if (! is_dir($outputDir) && ! mkdir($outputDir, 0775, true) && ! is_dir($outputDir)) {
            throw new RuntimeException("No se pudo crear el directorio de salida: {$outputDir}");
        }

        $filename = $outputFilename ?: ('chequera-' . now()->format('Ymd-His') . '.pdf');
        $fullPath = rtrim($outputDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;

        $pdf->Output('F', $fullPath);

        return $fullPath;
    }

    /**
     * @param  array<string, float>  $slot
     * @param  array<string, mixed>  $header
     * @param  array<string, mixed>  $installment
     */
    private function printInstallmentIntoSlot(Fpdi $pdf, array $slot, array $header, array $installment): void
    {
        $fields = config('checkbook_pdf.fields', []);
        $font = config('checkbook_pdf.font', []);

        $pdf->SetFont(
            (string) ($font['family'] ?? 'Helvetica'),
            (string) ($font['style'] ?? ''),
            (float) ($font['size'] ?? 8)
        );
        $pdf->SetTextColor(0, 0, 0);

        $map = [
            'contrato' => (string) ($header['contrato'] ?? ''),
            'grupo' => (string) ($header['grupo'] ?? ''),
            'destino' => (string) ($header['destino'] ?? ''),
            'padre_tutor' => (string) ($header['padre_tutor'] ?? ''),
            'pax' => (string) ($header['pax'] ?? ''),
            'dni' => (string) ($header['dni'] ?? ''),
            'periodo' => (string) ($header['periodo'] ?? ''),
            'nro_cuota' => (string) ($installment['nro_cuota'] ?? $installment['numero'] ?? ''),
            // En el cuadro de vencimiento va solo el importe.
            'importe' => $this->formatAmount($installment['importe'] ?? $installment['monto'] ?? 0),
        ];

        foreach ($map as $fieldKey => $text) {
            $coords = Arr::get($fields, $fieldKey);
            if (! is_array($coords)) {
                continue;
            }

            $x = (float) ($slot['x'] ?? 0) + (float) ($coords['x'] ?? 0);
            $y = (float) ($slot['y'] ?? 0) + (float) ($coords['y'] ?? 0);

            $pdf->SetXY($x, $y);
            $pdf->Cell(0, 4, $this->sanitize($text), 0, 0, 'L');
        }
    }

    private function formatAmount(mixed $amount): string
    {
        $value = is_numeric($amount) ? (float) $amount : 0.0;

        return '$ ' . number_format($value, 0, ',', '.') . '.-';
    }

    private function sanitize(string $text): string
    {
        return iconv('UTF-8', 'windows-1252//TRANSLIT', $text) ?: $text;
    }
}
