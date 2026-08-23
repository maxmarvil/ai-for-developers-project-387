<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ErrorCode;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class ApiExceptionHandler
{
    public static function render(Request $request, Throwable $e): JsonResponse
    {
        if ($e instanceof BookingException) {
            return self::bookingExceptionResponse($e);
        }

        if ($e instanceof ValidationException) {
            return self::validationResponse($e);
        }

        if ($e instanceof NotFoundHttpException) {
            return self::notFoundResponse($e);
        }

        if ($e instanceof ThrottleRequestsException) {
            return self::tooManyRequestsResponse();
        }

        if ($e instanceof QueryException && self::isUniqueViolation($e)) {
            return self::conflictResponse();
        }

        Log::error('Unhandled API exception', [
            'exception' => $e::class,
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return self::genericResponse();
    }

    private static function bookingExceptionResponse(BookingException $e): JsonResponse
    {
        return response()->json([
            'code' => $e->getErrorCode()->value,
            'message' => $e->getMessage(),
        ], $e->getHttpStatus());
    }

    private static function validationResponse(ValidationException $e): JsonResponse
    {
        return response()->json([
            'code' => ErrorCode::VALIDATION_ERROR->value,
            'message' => 'The given data was invalid.',
            'errors' => $e->errors(),
        ], 422);
    }

    private static function notFoundResponse(NotFoundHttpException $e): JsonResponse
    {
        return response()->json([
            'code' => ErrorCode::NOT_FOUND->value,
            'message' => $e->getMessage() ?: 'Resource not found.',
        ], 404);
    }

    private static function conflictResponse(): JsonResponse
    {
        return response()->json([
            'code' => ErrorCode::SLOT_TAKEN->value,
            'message' => 'One or more requested slots are already taken.',
        ], 400);
    }

    private static function tooManyRequestsResponse(): JsonResponse
    {
        return response()->json([
            'code' => ErrorCode::LIMIT_EXCEEDED->value,
            'message' => 'Too many requests. Please slow down.',
        ], 429);
    }

    private static function genericResponse(): JsonResponse
    {
        return response()->json([
            'code' => ErrorCode::VALIDATION_ERROR->value,
            'message' => 'An unexpected error occurred.',
        ], 500);
    }

    private static function isUniqueViolation(QueryException $e): bool
    {
        $code = $e->getCode();

        // PostgreSQL unique violation SQLSTATE code
        return $code === '23505';
    }
}
