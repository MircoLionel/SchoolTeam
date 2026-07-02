<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('cash_movements', function (Blueprint $table) {
            $table->index('created_at', 'cash_movements_created_at_idx');
            $table->index('cash_box', 'cash_movements_cash_box_idx');
            $table->index('category_id', 'cash_movements_category_id_idx');
            $table->index('type', 'cash_movements_type_idx');
            $table->index('date', 'cash_movements_date_idx');
        });
    }

    public function down(): void
    {
        Schema::table('cash_movements', function (Blueprint $table) {
            $table->dropIndex('cash_movements_created_at_idx');
            $table->dropIndex('cash_movements_cash_box_idx');
            $table->dropIndex('cash_movements_category_id_idx');
            $table->dropIndex('cash_movements_type_idx');
            $table->dropIndex('cash_movements_date_idx');
        });
    }
};
