<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PassengerType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'percentage',
    ];
}
