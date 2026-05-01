<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('checkbooks', function (Blueprint $table) {
            $table->timestamp('printed_at')->nullable()->after('status');
            $table->foreignId('printed_by_user_id')->nullable()->after('printed_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('checkbooks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('printed_by_user_id');
            $table->dropColumn('printed_at');
        });
    }
};
