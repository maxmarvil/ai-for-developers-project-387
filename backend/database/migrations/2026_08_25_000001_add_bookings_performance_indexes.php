<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Ускоряет выборку броней конкретного гостя и проверку лимита 2ч (BR-1) в BookingService.
            $table->index('guest_id');
            // Ускоряет разрешение статуса слота по временному диапазону в SlotService::resolveSlotStatus.
            $table->index('starts_at');
            // Составной индекс для фильтров Filament по дате и статусу, а также запросов доступности слотов.
            $table->index(['date', 'status'], 'bookings_date_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_date_status_idx');
            $table->dropIndex('bookings_starts_at_index');
            $table->dropIndex('bookings_guest_id_index');
        });
    }
};
