<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->constrained()->cascadeOnDelete();
            $table->uuid('booking_group_id')->index();
            $table->date('date');
            $table->time('start_time');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->text('comment')->nullable();
            $table->string('status', 20)->default('pending');
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['event_type_id', 'date', 'start_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
