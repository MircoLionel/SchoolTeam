<?php

namespace App\Models;

use App\Enums\AccountMovementType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'passenger_id',
        'trip_id',
        'date',
        'type',
        'amount',
        'payment_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'type' => AccountMovementType::class,
    ];
}
