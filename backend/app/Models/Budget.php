<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'base_price_100',
        'suggested_installments',
        'version',
        'status',
        'pdf_path',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }
}
