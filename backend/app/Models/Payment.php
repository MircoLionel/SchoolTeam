<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'passenger_id',
        'trip_id',
        'date',
        'payment_date',
        'method',
        'amount_total',
        'status',
        'voided_at',
        'voided_by_user_id',
        'void_reason',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'payment_date' => 'date',
        'method' => PaymentMethod::class,
        'voided_at' => 'datetime',
    ];
}
