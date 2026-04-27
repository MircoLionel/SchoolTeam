<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CouponCollectPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role !== 'READONLY';
    }

    public function rules(): array
    {
        return [
            'passenger_id' => ['required', 'integer', 'exists:passengers,id'],
            'trip_id' => ['nullable', 'integer', 'exists:trips,id'],
            'payment_method' => ['nullable', 'string'],
            'collected_by' => ['nullable', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string'],
            'detail' => ['nullable', 'string'],
            'date' => ['nullable', 'date'],
            'payment_date' => ['nullable', 'date'],
        ];
    }
}
