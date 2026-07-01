<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('status')->default('POSTED')->after('amount_total');
            $table->timestamp('voided_at')->nullable()->after('status');
            $table->foreignId('voided_by_user_id')
                ->nullable()
                ->after('voided_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->string('void_reason')->nullable()->after('voided_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('voided_by_user_id');
            $table->dropColumn(['status', 'voided_at', 'void_reason']);
        });
    }
};
