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

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    public function grade()
    {
        return $this->belongsTo(Grade::class);
    }

    public function shifts()
    {
        return $this->belongsToMany(Shift::class, 'trip_shifts');
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }

    public function latestBudget()
    {
        return $this->hasOne(Budget::class)->latestOfMany('version');
    }
}
