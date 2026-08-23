<?php

declare(strict_types=1);

namespace App\Enums;

enum ErrorCode: string
{
    case VALIDATION_ERROR = 'VALIDATION_ERROR';
    case NOT_FOUND = 'NOT_FOUND';
    case LIMIT_EXCEEDED = 'LIMIT_EXCEEDED';
    case SLOT_TAKEN = 'SLOT_TAKEN';
    case SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE';
    case SLOT_NOT_SEQUENTIAL = 'SLOT_NOT_SEQUENTIAL';
    case DATE_OUT_OF_RANGE = 'DATE_OUT_OF_RANGE';
}
