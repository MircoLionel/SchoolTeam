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

        $templatePath = config('checkbook_pdf.template_path');
        if (! is_string($templatePath) || ! is_file($templatePath)) {
            throw new RuntimeException("No se encontró la plantilla PDF en: {$templatePath}");
        }

        $groups = config('checkbook_pdf.repeat_groups', []);
        if (! is_array($groups) || $groups === []) {
            throw new RuntimeException('La configuración repeat_groups de checkbook_pdf es inválida.');
        }

        $pdf = new Fpdi('P', 'mm');
        $pageCount = $pdf->setSourceFile($templatePath);
        $sourcePage = (int) config('checkbook_pdf.source_page', 1);
        if ($sourcePage < 1 || $sourcePage > $pageCount) {
            throw new RuntimeException("source_page={$sourcePage} es inválida para la plantilla ({$pageCount} páginas).");
        }

        $templateId = $pdf->importPage($sourcePage);
        $rowsPerPage = count($groups);

        foreach (array_chunk($installments, $rowsPerPage) as $pageInstallments) {
            $pdf->addPage();
            $pdf->useTemplate($templateId, 0, 0);

            foreach ($pageInstallments as $rowIndex => $installment) {
                foreach ($groups[$rowIndex] as $slotIndex) {
                    $this->printInstallmentIntoSlot($pdf, (int) $slotIndex, $header, $installment);
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
     * @param  array<string, mixed>  $header
     * @param  array<string, mixed>  $installment
     */
    private function printInstallmentIntoSlot(Fpdi $pdf, int $slotIndex, array $header, array $installment): void
    {
        $slots = config('checkbook_pdf.slots', []);
        $fields = config('checkbook_pdf.fields', []);
        $font = config('checkbook_pdf.font', []);

        $slot = Arr::get($slots, $slotIndex);
        if (! is_array($slot)) {
            throw new RuntimeException("Slot {$slotIndex} no configurado en checkbook_pdf.slots");
        }

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
