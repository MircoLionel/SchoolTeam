<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class NonCashPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role !== 'READONLY';
    }

    public function rules(): array
    {
        return [
            'passenger_id' => ['required', 'integer'],
            'trip_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0'],
            'method' => ['required', 'string'],
            'reference' => ['nullable', 'string'],
            'date' => ['nullable', 'date'],
        ];
    }
}
