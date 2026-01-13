<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Trip extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'grade_id',
        'destination',
        'group_name',
        'year',
        'status',
    ];
}
