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
        // Nueva plantilla:
        // contrato -> ESCUELA
        // grupo -> Grado
        'contrato' => ['x' => 26.0, 'y' => 27.0, 'w' => 37.0, 'align' => 'L'],
        'grupo' => ['x' => 26.0, 'y' => 32.0, 'w' => 37.0, 'align' => 'L'],
        'destino' => ['x' => 26.0, 'y' => 41.0, 'w' => 37.0, 'align' => 'L'],
        'padre_tutor' => ['x' => 26.0, 'y' => 46.0, 'w' => 37.0, 'align' => 'L'],
        'pax' => ['x' => 26.0, 'y' => 56.0, 'w' => 37.0, 'align' => 'L'],
        'dni' => ['x' => 26.0, 'y' => 65.0, 'w' => 37.0, 'align' => 'L'],
        'periodo' => ['x' => 26.0, 'y' => 70.0, 'w' => 37.0, 'align' => 'L'],
        'nro_cuota' => ['x' => 26.0, 'y' => 75.0, 'w' => 37.0, 'align' => 'L'],
        // En "VENCIMIENTOS" va solo el precio, ej: "$ 23000.-"
        'importe' => ['x' => 33.0, 'y' => 85.5, 'w' => 31.0, 'align' => 'L'],
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
