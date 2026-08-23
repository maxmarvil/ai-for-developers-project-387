<?php

declare(strict_types=1);

namespace App\Enums;

enum SlotStatus: string
{
    case FREE = 'free';
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
}
