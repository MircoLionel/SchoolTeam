<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('guardians', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('dni_type');
            $table->string('dni');
            $table->date('birthdate')->nullable();
            $table->string('sex')->nullable();
            $table->string('address')->nullable();
            $table->string('locality')->nullable();
            $table->string('province')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
        });

        Schema::create('passengers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('school_id')->constrained('schools');
            $table->foreignId('grade_id')->constrained('grades');
            $table->foreignId('shift_id')->constrained('shifts');
            $table->foreignId('guardian_id')->constrained('guardians');
            $table->foreignId('passenger_type_id')->constrained('passenger_types');
            $table->string('full_name');
            $table->string('dni');
            $table->date('birthdate')->nullable();
            $table->string('sex')->nullable();
            $table->string('address')->nullable();
            $table->string('locality')->nullable();
            $table->string('province')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();

            $table->unique(['trip_id', 'dni']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passengers');
        Schema::dropIfExists('guardians');
    }
};
