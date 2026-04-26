<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'type',
        'category_id',
        'amount',
        'method',
        'detail',
        'attachment_path',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function category()
    {
        return $this->belongsTo(CashCategory::class, 'category_id');
    }
}
