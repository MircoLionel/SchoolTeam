<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CASH = 'CASH';
    case TRANSFER = 'TRANSFER';
    case MP = 'MP';
    case DEBIT = 'DEBIT';
    case CREDIT = 'CREDIT';
    case OTHER = 'OTHER';
}
