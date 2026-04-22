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
        ['x' => 0.0, 'y' => 0.0],
        ['x' => 0.0, 'y' => 99.0],
        ['x' => 0.0, 'y' => 198.0],
    ],

    /*
    |--------------------------------------------------------------------------
    | Offsets horizontales de los 3 troqueles por fila
    |--------------------------------------------------------------------------
    | 0 = talón izquierdo, luego centro y derecho.
    */
    'copy_offsets_x' => [0.0, 70.0, 140.0],

    /*
    |--------------------------------------------------------------------------
    | Campos relativos al origen de cada troquel
    |--------------------------------------------------------------------------
    */
    'fields' => [
        'contrato' => ['x' => 13.0, 'y' => 16.2, 'w' => 31.0, 'align' => 'L'],
        'grupo' => ['x' => 13.0, 'y' => 21.2, 'w' => 31.0, 'align' => 'L'],
        'destino' => ['x' => 13.0, 'y' => 30.4, 'w' => 31.0, 'align' => 'L'],
        'padre_tutor' => ['x' => 13.0, 'y' => 35.3, 'w' => 31.0, 'align' => 'L'],
        'pax' => ['x' => 13.0, 'y' => 45.0, 'w' => 31.0, 'align' => 'L'],
        'dni' => ['x' => 13.0, 'y' => 54.0, 'w' => 31.0, 'align' => 'L'],
        'periodo' => ['x' => 13.0, 'y' => 59.0, 'w' => 31.0, 'align' => 'L'],
        'nro_cuota' => ['x' => 13.0, 'y' => 64.0, 'w' => 31.0, 'align' => 'L'],
        // En "VENCIMIENTOS" va solo el precio, ej: "$ 23000.-"
        'importe' => ['x' => 33.0, 'y' => 76.5, 'w' => 31.0, 'align' => 'L'],
    ],

    'font' => [
        'family' => 'Helvetica',
        'style' => '',
        'size' => 8,
    ],


    // Binario de Ghostscript para normalizar plantillas PDF incompatibles con FPDI free.
    // Si no se encuentra, el servicio prueba gs, gswin64c y gswin32c automáticamente.
    'ghostscript_binary' => env('GHOSTSCRIPT_BINARY', 'gs'),

    // Carpeta temporal para plantillas normalizadas.
    'tmp_dir' => storage_path('app/checkbooks/tmp'),

    'output_dir' => storage_path('app/checkbooks'),
];
