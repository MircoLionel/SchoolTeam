<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentDetail extends Model
{
    use HasFactory;

    protected $table = 'payment_details';

    public $timestamps = false;

    protected $fillable = [
        'payment_id',
        'coupon_id',
        'kind',
        'amount',
    ];
}
