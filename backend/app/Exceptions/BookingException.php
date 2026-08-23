<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ErrorCode;
use Exception;

final class BookingException extends Exception
{
    public function __construct(
        private readonly ErrorCode $errorCode,
        string $message = '',
        private readonly int $httpStatus = 400,
    ) {
        parent::__construct($message);
    }

    public function getErrorCode(): ErrorCode
    {
        return $this->errorCode;
    }

    public function getHttpStatus(): int
    {
        return $this->httpStatus;
    }
}
