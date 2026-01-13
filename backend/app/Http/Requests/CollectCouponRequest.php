<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CollectCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role !== 'READONLY';
    }

    public function rules(): array
    {
        return [
            'amount_collected' => ['required', 'numeric', 'min:0'],
            'reason' => ['nullable', 'string'],
        ];
    }
}
