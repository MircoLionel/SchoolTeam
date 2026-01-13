<?php

namespace App\Enums;

enum CouponStatus: string
{
    case ISSUED = 'ISSUED';
    case COLLECTED = 'COLLECTED';
    case VOID = 'VOID';
}
