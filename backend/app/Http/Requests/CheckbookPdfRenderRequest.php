<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckbookPdfRenderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'header' => ['required', 'array'],
            'header.contrato' => ['nullable', 'string', 'max:100'],
            'header.grupo' => ['nullable', 'string', 'max:100'],
            'header.destino' => ['nullable', 'string', 'max:120'],
            'header.padre_tutor' => ['nullable', 'string', 'max:120'],
            'header.pax' => ['nullable', 'string', 'max:30'],
            'header.dni' => ['nullable', 'string', 'max:30'],
            'header.periodo' => ['nullable', 'string', 'max:50'],
            'installments' => ['required', 'array', 'min:1'],
            'installments.*.nro_cuota' => ['nullable', 'string', 'max:20'],
            'installments.*.numero' => ['nullable', 'integer', 'min:1'],
            'installments.*.importe' => ['nullable', 'numeric', 'min:0'],
            'installments.*.monto' => ['nullable', 'numeric', 'min:0'],
            'code' => ['nullable', 'string', 'max:80'],
        ];
    }
}
