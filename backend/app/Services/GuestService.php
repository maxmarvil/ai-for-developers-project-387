<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Guest;

final class GuestService
{
    public function firstOrCreateByEmail(string $email, string $name, ?string $phone = null): Guest
    {
        return Guest::firstOrCreate(
            ['email' => mb_strtolower(trim($email))],
            ['name' => $name, 'phone' => $phone],
        );
    }
}
