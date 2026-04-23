<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/health', function () {
    $database = 'ok';
    try {
        DB::connection()->getPdo();
    } catch (\Throwable $e) {
        $database = 'error';
    }

    $statusCode = $database === 'ok' ? 200 : 503;

    return response()->json([
        'status' => $database === 'ok' ? 'ok' : 'degraded',
        'database' => $database,
        'app_env' => app()->environment(),
    ], $statusCode);
});
