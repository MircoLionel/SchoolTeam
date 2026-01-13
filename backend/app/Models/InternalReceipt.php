<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InternalReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'type',
        'number',
        'pdf_path',
    ];
}
