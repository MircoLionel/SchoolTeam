<?php

return [
    'template_path' => env('CHECKBOOK_TEMPLATE_PATH', storage_path('app/templates/1,2,3 (2).pdf')),
    'source_page' => 1,

    /*
    |--------------------------------------------------------------------------
    | Cupones por página
    |--------------------------------------------------------------------------
    | La plantilla tiene espacio para 3 cuotas por página (1 por fila).
    | Cada cuota se replica horizontalmente en 3 comprobantes iguales.
    */
    'coupons_per_page' => 3,

    /*
    |--------------------------------------------------------------------------
    | Posición base de cada cupón (fila) dentro de la página
    |--------------------------------------------------------------------------
    */
    'coupon_positions' => [
        ['x' => 104.0, 'y' => 17.0],
        ['x' => 104.0, 'y' => 105.0],
        ['x' => 104.0, 'y' => 193.0],
    ],

    /*
    |--------------------------------------------------------------------------
    | Offsets horizontales de los 3 troqueles por fila
    |--------------------------------------------------------------------------
    | 0 = talón izquierdo, luego centro y derecho.
    */
    'copy_offsets_x' => [0.0, 41.5, 83.0],

    /*
    |--------------------------------------------------------------------------
    | Campos relativos al origen de cada troquel
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
