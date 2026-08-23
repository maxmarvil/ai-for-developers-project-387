<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BookingStatus;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property EventType $eventType
 * @property Guest $guest
 * @property Carbon $date
 * @property Carbon $starts_at
 * @property Carbon $ends_at
 * @property BookingStatus $status
 */
class Booking extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'event_type_id',
        'guest_id',
        'booking_group_id',
        'date',
        'start_time',
        'starts_at',
        'ends_at',
        'comment',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'event_type_id' => 'integer',
            'guest_id' => 'integer',
            'date' => 'date',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'status' => BookingStatus::class,
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(EventType::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [BookingStatus::PENDING, BookingStatus::CONFIRMED]);
    }

    public function isConfirmed(): bool
    {
        return $this->status === BookingStatus::CONFIRMED;
    }

    public function isPending(): bool
    {
        return $this->status === BookingStatus::PENDING;
    }

    public function isCancelled(): bool
    {
        return $this->status === BookingStatus::CANCELLED;
    }
}
