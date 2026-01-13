<?php

namespace App\Enums;

enum Role: string
{
    case ADMIN = 'ADMIN';
    case OFFICE = 'OFFICE';
    case READONLY = 'READONLY';
}
