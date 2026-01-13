<?php

namespace App\Enums;

enum InstallmentStatus: string
{
    case PENDING = 'PENDING';
    case PAID = 'PAID';
}
