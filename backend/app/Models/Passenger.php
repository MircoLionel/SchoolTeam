<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Passenger extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'school_id',
        'grade_id',
        'shift_id',
        'guardian_id',
        'passenger_type_id',
        'full_name',
        'dni',
        'birthdate',
        'sex',
        'address',
        'locality',
        'province',
        'postal_code',
        'phone',
        'email',
    ];

    public function passenger_type()
    {
        return $this->belongsTo(PassengerType::class);
    }
}
