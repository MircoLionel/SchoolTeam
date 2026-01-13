<?php

namespace App\Enums;

enum AccountMovementType: string
{
    case CUOTA = 'CUOTA';
    case RECARGO = 'RECARGO';
    case DESCUENTO = 'DESCUENTO';
    case NOTA_CREDITO = 'NOTA_CREDITO';
    case AJUSTE = 'AJUSTE';
}
