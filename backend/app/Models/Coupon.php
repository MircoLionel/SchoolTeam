<?php

namespace App\Models;

use App\Enums\CouponStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'checkbook_id',
        'installment_number',
        'amount_printed',
        'barcode_value',
        'status',
        'collected_by_user_id',
        'collected_at',
    ];

    protected $casts = [
        'status' => CouponStatus::class,
        'collected_at' => 'datetime',
    ];

    public function checkbook()
    {
        return $this->belongsTo(Checkbook::class);
    }
}
