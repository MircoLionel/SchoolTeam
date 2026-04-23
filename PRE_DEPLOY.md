# PRE_DEPLOY checklist

- [ ] `APP_KEY` definido para producción.
- [ ] `APP_ENV=production` y `APP_DEBUG=false`.
- [ ] `DB_CONNECTION=pgsql` y variables DB correctas (o `DATABASE_URL`).
- [ ] `SESSION_SECURE_COOKIE=true`.
- [ ] `FORCE_HTTPS=true`.
- [ ] `CORS_ALLOWED_ORIGINS` apunta al frontend real.
- [ ] `SANCTUM_STATEFUL_DOMAINS` correcto.
- [ ] `SEED_DEFAULT_USERS=false` en producción.
- [ ] Revisar que no existan secretos hardcodeados en código.
- [ ] Definir estrategia de persistencia para `storage/app/checkbooks` y plantillas.
- [ ] Confirmar `VITE_API_URL` del frontend.
- [ ] Revisar migraciones pendientes: `php artisan migrate:status`.
