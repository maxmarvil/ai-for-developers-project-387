<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AvailabilityRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AvailabilityRule>
 */
class AvailabilityRuleFactory extends Factory
{
    protected $model = AvailabilityRule::class;

    public function definition(): array
    {
        return [
            'weekday' => $this->faker->unique()->numberBetween(0, 6),
            'start_time' => '09:00:00',
            'end_time' => '18:00:00',
        ];
    }

    public function weekday(int $weekday): static
    {
        return $this->state(fn () => ['weekday' => $weekday]);
    }

    public function hours(string $start, string $end): static
    {
        return $this->state(fn () => [
            'start_time' => $start,
            'end_time' => $end,
        ]);
    }
}
