<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InstallmentPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'passenger_id',
        'trip_id',
        'count',
        'total',
        'created_by',
    ];

    public function installments()
    {
        return $this->hasMany(Installment::class, 'plan_id');
    }
}
