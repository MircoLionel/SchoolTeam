<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->decimal('base_price_100', 12, 2);
            $table->integer('suggested_installments');
            $table->integer('version');
            $table->string('status')->default('ACTIVE');
            $table->string('pdf_path')->nullable();
            $table->timestamps();
        });

        Schema::create('passenger_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('percentage', 5, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passenger_types');
        Schema::dropIfExists('budgets');
    }
};
