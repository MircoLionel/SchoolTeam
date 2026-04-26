<?php

use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\CashMovementController;
use App\Http\Controllers\Api\InstallmentPlanController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

Log::info('API ROUTES FILE HIT', [
    'file' => 'routes/api.php',
]);

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::get('/me', [AuthController::class, 'me']);

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('schools', \App\Http\Controllers\Api\SchoolController::class);
    Route::apiResource('grades', \App\Http\Controllers\Api\GradeController::class);
    Route::apiResource('shifts', \App\Http\Controllers\Api\ShiftController::class);
    Route::apiResource('school-grade-shifts', \App\Http\Controllers\Api\SchoolGradeShiftController::class);
    Route::apiResource('trips', \App\Http\Controllers\Api\TripController::class);
    Route::post('/trips/{trip}/shifts', [\App\Http\Controllers\Api\TripShiftController::class, 'store']);
    Route::delete('/trips/{trip}/shifts/{shift}', [\App\Http\Controllers\Api\TripShiftController::class, 'destroy']);
    Route::apiResource('budgets', \App\Http\Controllers\Api\BudgetController::class);
    Route::apiResource('passenger-types', \App\Http\Controllers\Api\PassengerTypeController::class);
    Route::apiResource('guardians', \App\Http\Controllers\Api\GuardianController::class);
    Route::apiResource('passengers', \App\Http\Controllers\Api\PassengerController::class);

    Route::post('/installment-plans', [InstallmentPlanController::class, 'store']);
    Route::get('/installment-plans/{plan}', [InstallmentPlanController::class, 'show']);
    Route::patch('/installments/{installment}', [InstallmentPlanController::class, 'updateInstallment']);

    Route::post('/checkbooks', [\App\Http\Controllers\Api\CheckbookController::class, 'store']);
    Route::post('/checkbooks/render-pdf', [\App\Http\Controllers\Api\CheckbookController::class, 'renderPdf']);
    Route::get('/checkbooks/{checkbook}/pdf', [\App\Http\Controllers\Api\CheckbookController::class, 'downloadPdf']);

    Route::post('/coupons/scan', [CouponController::class, 'scan']);
    Route::post('/coupons/{coupon}/collect', [CouponController::class, 'collect']);

    Route::post('/payments/non-cash', [PaymentController::class, 'storeNonCash']);
    Route::post('/payments/coupon-collect', [PaymentController::class, 'storeCouponCollect']);
    Route::get('/payments/{payment}/receipt', [PaymentController::class, 'receipt']);

    Route::get('/accounts/{passenger}', [ReportController::class, 'passengerAccount']);

    Route::get('/cash-movements', [CashMovementController::class, 'index']);
    Route::post('/cash-movements/expense', [CashMovementController::class, 'storeExpense']);
    Route::delete('/cash-movements/{cashMovement}', [CashMovementController::class, 'destroy']);
    Route::delete('/cash-movements', [CashMovementController::class, 'reset']);

    Route::get('/reports/passengers', [ReportController::class, 'passengers']);
    Route::get('/reports/passenger-status', [ReportController::class, 'passengerStatus']);
    Route::get('/reports/cashbox', [ReportController::class, 'cashbox']);
    Route::get('/reports/provider-profit', [ReportController::class, 'providerProfit']);

    Route::get('/audit', [AuditController::class, 'index']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::patch('/users/{user}', [UserController::class, 'update']);
});
