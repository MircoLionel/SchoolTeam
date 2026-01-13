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
        'method',
        'amount_total',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'method' => PaymentMethod::class,
    ];
}
