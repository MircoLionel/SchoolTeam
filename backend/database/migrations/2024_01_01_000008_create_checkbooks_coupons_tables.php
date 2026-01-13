<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('checkbooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained('passengers')->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('installment_plans')->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('status')->default('ACTIVE');
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkbook_id')->constrained('checkbooks')->cascadeOnDelete();
            $table->integer('installment_number');
            $table->decimal('amount_printed', 12, 2);
            $table->string('barcode_value')->unique();
            $table->string('status')->default('ISSUED');
            $table->unsignedBigInteger('collected_by_user_id')->nullable();
            $table->timestamp('collected_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('checkbooks');
    }
};
