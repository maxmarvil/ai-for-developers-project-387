<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AvailabilityException;
use App\Models\AvailabilityRule;
use App\Models\EventType;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Date;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->createAdminUser();
        $this->createEventTypes();
        $this->createAvailabilityRules();
        $this->createAvailabilityExceptions();
    }

    private function createAdminUser(): void
    {
        $role = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);

        $user = User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
        ]);

        $user->assignRole($role);
    }

    private function createEventTypes(): void
    {
        EventType::factory()->create([
            'name' => 'Консультация',
            'description' => 'Индивидуальная консультация 30 минут',
            'duration_minutes' => 30,
            'color' => '#3b82f6',
            'is_active' => true,
        ]);

        EventType::factory()->create([
            'name' => 'Быстрый созвон',
            'description' => 'Краткий созвон 15 минут',
            'duration_minutes' => 15,
            'color' => '#10b981',
            'is_active' => true,
        ]);
    }

    private function createAvailabilityRules(): void
    {
        $start = '09:00';
        $end = '18:00';

        foreach (range(1, 5) as $weekday) {
            AvailabilityRule::factory()->create([
                'weekday' => $weekday,
                'start_time' => $start,
                'end_time' => $end,
            ]);
        }
    }

    private function createAvailabilityExceptions(): void
    {
        $tomorrow = Date::now()->addDay()->format('Y-m-d');

        AvailabilityException::factory()->create([
            'date' => $tomorrow,
            'is_closed' => true,
        ]);
    }
}
