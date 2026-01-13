<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools');
            $table->foreignId('grade_id')->constrained('grades');
            $table->string('destination');
            $table->string('group_name');
            $table->integer('year');
            $table->string('status')->default('ACTIVE');
            $table->timestamps();
        });

        Schema::create('trip_shifts', function (Blueprint $table) {
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained('shifts');
            $table->primary(['trip_id', 'shift_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_shifts');
        Schema::dropIfExists('trips');
    }
};
