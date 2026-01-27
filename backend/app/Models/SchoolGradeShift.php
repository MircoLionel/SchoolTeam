<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolGradeShift extends Model
{
    use HasFactory;

    protected $table = 'school_grade_shift';

    protected $fillable = [
        'school_id',
        'grade_id',
        'shift_id',
        'route',
        'contact_name',
        'contact_phone',
        'contact_email',
    ];

    public $timestamps = false;
}
