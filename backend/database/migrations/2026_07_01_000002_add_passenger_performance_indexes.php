<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('passengers', function (Blueprint $table) {
            $table->index('dni', 'passengers_dni_idx');
            $table->index('full_name', 'passengers_full_name_idx');
            $table->index('school_id', 'passengers_school_id_idx');
            $table->index('trip_id', 'passengers_trip_id_idx');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->index('passenger_id', 'payments_passenger_id_idx');
        });

        Schema::table('account_movements', function (Blueprint $table) {
            $table->index('passenger_id', 'account_movements_passenger_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('passengers', function (Blueprint $table) {
            $table->dropIndex('passengers_dni_idx');
            $table->dropIndex('passengers_full_name_idx');
            $table->dropIndex('passengers_school_id_idx');
            $table->dropIndex('passengers_trip_id_idx');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_passenger_id_idx');
        });

        Schema::table('account_movements', function (Blueprint $table) {
            $table->dropIndex('account_movements_passenger_id_idx');
        });
    }
};
