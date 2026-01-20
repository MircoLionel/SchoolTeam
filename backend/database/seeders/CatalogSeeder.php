<?php

namespace Database\Seeders;

use App\Models\Grade;
use App\Models\Shift;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $grades = [
            '1° grado',
            '2° grado',
            '3° grado',
            '4° grado',
            '5° grado',
            '6° grado',
            '7° grado',
        ];

        foreach ($grades as $name) {
            Grade::updateOrCreate(['name' => $name], ['name' => $name]);
        }

        $shifts = ['Turno mañana', 'Turno tarde'];

        foreach ($shifts as $name) {
            Shift::updateOrCreate(['name' => $name], ['name' => $name]);
        }
    }
}
