<?php

return [
    'template_path' => storage_path('app/templates/1,2,3 (2).pdf'),
    'source_page' => 1,

    /*
    |--------------------------------------------------------------------------
    | Posiciones base de cada talón (9 por hoja)
    |--------------------------------------------------------------------------
    | Coordenadas absolutas en mm, de la esquina superior izquierda de cada
    | talón en la plantilla.
    */
    'slots' => [
        ['x' => 104.0, 'y' => 17.0],
        ['x' => 145.5, 'y' => 17.0],
        ['x' => 187.0, 'y' => 17.0],

        ['x' => 104.0, 'y' => 105.0],
        ['x' => 145.5, 'y' => 105.0],
        ['x' => 187.0, 'y' => 105.0],

        ['x' => 104.0, 'y' => 193.0],
        ['x' => 145.5, 'y' => 193.0],
        ['x' => 187.0, 'y' => 193.0],
    ],

    /*
    |--------------------------------------------------------------------------
    | Repetición horizontal
    |--------------------------------------------------------------------------
    | Cada fila tiene 3 comprobantes iguales (pasajero/empresa/cobrador).
    | Cada grupo consume 1 cuota y la imprime en 3 slots.
    */
    'repeat_groups' => [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
    ],

    /*
    |--------------------------------------------------------------------------
    | Campos relativos al origen de cada slot
    |--------------------------------------------------------------------------
    */
    'fields' => [
        'contrato' => ['x' => 10.0, 'y' => 16.0],
        'grupo' => ['x' => 10.0, 'y' => 21.0],
        'destino' => ['x' => 10.0, 'y' => 30.0],
        'padre_tutor' => ['x' => 10.0, 'y' => 35.0],
        'pax' => ['x' => 10.0, 'y' => 45.0],
        'dni' => ['x' => 10.0, 'y' => 54.0],
        'periodo' => ['x' => 10.0, 'y' => 59.0],
        'nro_cuota' => ['x' => 10.0, 'y' => 64.0],
        // En "VENCIMIENTOS" va solo el precio, ej: "$ 23000.-"
        'importe' => ['x' => 11.0, 'y' => 76.5],
    ],

    'font' => [
        'family' => 'Helvetica',
        'style' => '',
        'size' => 8,
    ],

    'output_dir' => storage_path('app/checkbooks'),
];
