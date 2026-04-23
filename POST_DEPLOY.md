# POST_DEPLOY checklist

- [ ] `/up` responde 200.
- [ ] `/health` responde 200 y `database=ok`.
- [ ] Login funciona y devuelve token.
- [ ] Endpoints protegidos funcionan con token (`/api/me`).
- [ ] Módulo usuarios carga sin 500.
- [ ] Generación de chequera PDF funciona.
- [ ] CORS correcto desde frontend productivo.
- [ ] Verificar logs en Railway (sin stacktraces críticos).
- [ ] Verificar `php artisan migrate:status` sin pendientes inesperadas.
- [ ] Si hay archivos críticos, validar persistencia en volumen/S3.
