<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained('passengers')->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->date('date');
            $table->string('method');
            $table->decimal('amount_total', 12, 2);
            $table->unsignedBigInteger('created_by');
            $table->string('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained('coupons');
            $table->string('kind');
            $table->decimal('amount', 12, 2);
        });

        Schema::create('account_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained('passengers')->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->date('date');
            $table->string('type');
            $table->decimal('amount', 12, 2);
            $table->foreignId('payment_id')->nullable()->constrained('payments');
            $table->string('notes')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
        });

        Schema::create('internal_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->string('type');
            $table->string('number')->unique();
            $table->string('pdf_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('internal_receipts');
        Schema::dropIfExists('account_movements');
        Schema::dropIfExists('payment_details');
        Schema::dropIfExists('payments');
    }
};
