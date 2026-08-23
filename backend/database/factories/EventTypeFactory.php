<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\EventType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventType>
 */
class EventTypeFactory extends Factory
{
    protected $model = EventType::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->word(),
            'description' => $this->faker->sentence(),
            'duration_minutes' => $this->faker->randomElement([15, 30]),
            'color' => $this->faker->randomElement(['#3b82f6', '#ef4444', '#10b981', '#f59e0b']),
            'is_active' => true,
        ];
    }

    public function duration15(): static
    {
        return $this->state(fn () => ['duration_minutes' => 15]);
    }

    public function duration30(): static
    {
        return $this->state(fn () => ['duration_minutes' => 30]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
