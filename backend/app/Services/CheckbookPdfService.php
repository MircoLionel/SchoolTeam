<?php

namespace App\Services;

use Illuminate\Support\Arr;
use RuntimeException;
use setasign\Fpdi\Fpdi;
use Throwable;

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

        $configuredTemplatePath = (string) config('checkbook_pdf.template_path', '');
        $templatePath = $this->resolveTemplatePath($configuredTemplatePath);
        if ($templatePath === null) {
            throw new RuntimeException("No se encontró la plantilla en: {$configuredTemplatePath}. Subila en backend/storage/app/templates/1,2,3 (2).pdf (o .jpg/.png) o definí CHECKBOOK_TEMPLATE_PATH en .env");
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
        $pdf->SetAutoPageBreak(false);
        $templateSourcePath = $templatePath;
        $templateId = null;

        if (! $this->isImageTemplate($templatePath)) {
            $sourcePage = (int) config('checkbook_pdf.source_page', 1);
            [$pageCount, $templateSourcePath] = $this->loadTemplateWithFallback($pdf, $templatePath);

            if ($sourcePage < 1 || $sourcePage > $pageCount) {
                throw new RuntimeException("source_page={$sourcePage} es inválida para la plantilla ({$pageCount} páginas). ");
            }

            $templateId = $pdf->importPage($sourcePage);
        }

        // Regla solicitada: 1-3 cuotas => 1 página, 4-6 => 2, etc.
        foreach (array_chunk($installments, 3) as $installmentsPageGroup) {
            $pdf->addPage();
            if ($templateId !== null) {
                $pdf->useTemplate($templateId, 0, 0);
            } else {
                $pdf->Image($templatePath, 0, 0, 210, 297);
            }

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

        // Limpieza opcional del template normalizado temporal.
        if ($templateSourcePath !== $templatePath && is_file($templateSourcePath)) {
            @unlink($templateSourcePath);
        }

        return $fullPath;
    }

    private function resolveTemplatePath(string $configuredPath): ?string
    {
        $configuredPath = trim($configuredPath);
        if ($configuredPath !== '' && is_file($configuredPath)) {
            return $configuredPath;
        }

        if ($configuredPath === '') {
            return null;
        }

        $pathInfo = pathinfo($configuredPath);
        $directory = $pathInfo['dirname'] ?? '';
        $filename = $pathInfo['filename'] ?? '';

        if ($directory === '' || $filename === '') {
            return null;
        }

        foreach (['pdf', 'jpg', 'jpeg', 'png', 'webp'] as $extension) {
            $candidate = $directory . DIRECTORY_SEPARATOR . $filename . '.' . $extension;
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function isImageTemplate(string $templatePath): bool
    {
        $extension = strtolower((string) pathinfo($templatePath, PATHINFO_EXTENSION));

        return in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true);
    }

    /**
     * @return array{0:int,1:string}
     */
    private function loadTemplateWithFallback(Fpdi $pdf, string $templatePath): array
    {
        try {
            return [$pdf->setSourceFile($templatePath), $templatePath];
        } catch (Throwable $e) {
            if (! $this->isUnsupportedCompressionError($e)) {
                throw new RuntimeException('No se pudo abrir la plantilla PDF: ' . $e->getMessage(), 0, $e);
            }

            $normalizedPath = $this->normalizeTemplateWithGhostscript($templatePath);
            if ($normalizedPath === null) {
                throw new RuntimeException(
                    'La plantilla usa una compresión no soportada por FPDI gratuito y no se pudo normalizar automáticamente. ' .
                    'Guardala como PDF 1.4/1.5 desde Acrobat o instalá Ghostscript (gs) en el servidor.'
                );
            }

            try {
                return [$pdf->setSourceFile($normalizedPath), $normalizedPath];
            } catch (Throwable $retryError) {
                throw new RuntimeException(
                    'Se intentó normalizar la plantilla PDF pero FPDI no pudo importarla: ' . $retryError->getMessage(),
                    0,
                    $retryError
                );
            }
        }
    }

    private function isUnsupportedCompressionError(Throwable $e): bool
    {
        $message = strtolower($e->getMessage());

        return str_contains($message, 'compression technique')
            || str_contains($message, 'fpdi-pdf-parser')
            || str_contains($message, 'cross-reference stream')
            || str_contains($message, 'object stream');
    }

    private function normalizeTemplateWithGhostscript(string $templatePath): ?string
    {
        $binary = $this->resolveGhostscriptBinary();
        if ($binary === null) {
            return null;
        }

        $tmpDir = (string) config('checkbook_pdf.tmp_dir', storage_path('app/checkbooks/tmp'));

        if (! is_dir($tmpDir) && ! mkdir($tmpDir, 0775, true) && ! is_dir($tmpDir)) {
            return null;
        }

        $outputPath = rtrim($tmpDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'normalized-' . uniqid('', true) . '.pdf';

        $command = sprintf(
            '%s -dSAFER -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dDetectDuplicateImages=true -dCompressFonts=true -sOutputFile=%s %s 2>&1',
            escapeshellcmd($binary),
            escapeshellarg($outputPath),
            escapeshellarg($templatePath)
        );

        exec($command, $outputLines, $exitCode);

        if ($exitCode !== 0 || ! is_file($outputPath)) {
            if (is_file($outputPath)) {
                @unlink($outputPath);
            }

            return null;
        }

        return $outputPath;
    }


    private function resolveGhostscriptBinary(): ?string
    {
        $configured = trim((string) config('checkbook_pdf.ghostscript_binary', ''));

        $candidates = array_values(array_unique(array_filter([
            $configured !== '' ? $configured : null,
            'gs',
            'gswin64c',
            'gswin32c',
        ])));

        foreach ($candidates as $candidate) {
            if ($this->commandExists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function commandExists(string $command): bool
    {
        $probe = $this->isWindows()
            ? sprintf('where %s 2>NUL', escapeshellcmd($command))
            : sprintf('command -v %s >/dev/null 2>&1', escapeshellarg($command));

        exec($probe, $output, $exitCode);

        return $exitCode === 0;
    }

    private function isWindows(): bool
    {
        return DIRECTORY_SEPARATOR === '\\';
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
            $width = (float) ($coords['w'] ?? 0);
            $height = (float) ($coords['h'] ?? 4);
            $align = strtoupper((string) ($coords['align'] ?? 'L'));
            if (! in_array($align, ['L', 'C', 'R'], true)) {
                $align = 'L';
            }

            $pdf->SetXY($x, $y);
            $pdf->Cell($width, $height, $this->sanitize($this->truncate($text)), 0, 0, $align);
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

    private function truncate(string $text, int $max = 34): string
    {
        return mb_strimwidth(trim($text), 0, $max, '');
    }
}
