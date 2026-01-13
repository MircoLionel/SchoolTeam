<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InstallmentPlanRequest extends FormRequest
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
            'count' => ['required', 'integer', 'max:12'],
        ];
    }
}
