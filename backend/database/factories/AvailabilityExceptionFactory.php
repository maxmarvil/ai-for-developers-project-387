<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AvailabilityException;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AvailabilityException>
 */
class AvailabilityExceptionFactory extends Factory
{
    protected $model = AvailabilityException::class;

    public function definition(): array
    {
        return [
            'date' => $this->faker->unique()->date(),
            'is_closed' => true,
            'start_time' => null,
            'end_time' => null,
        ];
    }

    public function onDate(string $date): static
    {
        return $this->state(fn () => ['date' => $date]);
    }
}
