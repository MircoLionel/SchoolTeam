<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Checkbook extends Model
{
    use HasFactory;

    protected $fillable = [
        'passenger_id',
        'trip_id',
        'plan_id',
        'code',
        'status',
        'printed_at',
        'printed_by_user_id',
    ];

    protected $casts = [
        'printed_at' => 'datetime',
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function printedBy()
    {
        return $this->belongsTo(User::class, 'printed_by_user_id');
    }
}
