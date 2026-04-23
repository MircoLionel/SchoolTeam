<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ((bool) env('FORCE_HTTPS', true)) {
            URL::forceScheme('https');
        }

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(6)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });

        RateLimiter::for('sensitive', function (Request $request) {
            return Limit::perMinute(30)->by((string) optional($request->user())->id ?: $request->ip());
        });
    }
}
