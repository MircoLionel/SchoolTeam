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
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }
}
