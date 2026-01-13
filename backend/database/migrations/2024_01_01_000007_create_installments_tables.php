<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('installment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained('passengers')->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->integer('count');
            $table->decimal('total', 12, 2);
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
        });

        Schema::create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('installment_plans')->cascadeOnDelete();
            $table->integer('number');
            $table->decimal('amount_planned', 12, 2);
            $table->string('status')->default('PENDING');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installments');
        Schema::dropIfExists('installment_plans');
    }
};
