<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('schools', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('locality')->nullable();
            $table->string('address')->nullable();
            $table->timestamps();
        });

        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        Schema::create('school_grade_shift', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools');
            $table->foreignId('grade_id')->constrained('grades');
            $table->foreignId('shift_id')->constrained('shifts');
            $table->string('route')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_email')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_grade_shift');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('grades');
        Schema::dropIfExists('schools');
    }
};
