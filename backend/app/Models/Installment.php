<?php

namespace App\Models;

use App\Enums\InstallmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Installment extends Model
{
    use HasFactory;

    protected $fillable = [
        'plan_id',
        'number',
        'amount_planned',
        'status',
    ];

    protected $casts = [
        'status' => InstallmentStatus::class,
    ];
}
