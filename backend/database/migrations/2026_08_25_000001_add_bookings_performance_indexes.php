<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->index('guest_id');
            $table->index('starts_at');
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
