<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guardian extends Model
{
    use HasFactory;

    protected $fillable = [
        'full_name',
        'dni_type',
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

    public function passengers()
    {
        return $this->hasMany(Passenger::class);
    }
}
