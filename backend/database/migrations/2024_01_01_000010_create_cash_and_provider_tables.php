<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('type');
            $table->foreignId('category_id')->constrained('cash_categories');
            $table->decimal('amount', 12, 2);
            $table->string('method')->nullable();
            $table->string('detail')->nullable();
            $table->string('attachment_path')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
        });

        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('contact')->nullable();
        });

        Schema::create('provider_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('providers');
            $table->string('concept');
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_costs');
        Schema::dropIfExists('providers');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('cash_categories');
    }
};
