# School Team Turismo

Aplicación full-stack para la gestión de viajes escolares, cobros por cupones y control operativo. Incluye backend Laravel 11 (API REST + Sanctum) y frontend React 18 + Vite + TypeScript.

## Stack

- **Backend**: Laravel 11, PHP 8.3, PostgreSQL 15+
- **Frontend**: React 18, Vite, TypeScript
- **Auth**: Sanctum (SPA)
- **RBAC**: ADMIN / OFFICE / READONLY
- **Auditoría**: audit_logs
- **PDF**: chequeras A4 + Code128, comprobante X

## Estructura

```
.
├── backend
├── docker-compose.yml
├── index.html
├── src
└── vite.config.ts
```

## Backend (Laravel)

### Setup rápido con Docker

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
```

### Migraciones y seed

```bash
docker compose exec app php artisan migrate

docker compose exec app php artisan db:seed
```

Seeder incluye **admin por defecto**:
- `admin@schoolteam.turismo` / `admin123`

### Endpoints principales

Todos bajo `/api`:

- Auth: `POST /auth/login`, `POST /auth/logout`, `GET /me`
- CRUD: `/schools`, `/grades`, `/shifts`, `/trips`, `/budgets`, `/passenger-types`, `/guardians`, `/passengers`
- Plan de cuotas: `POST /installment-plans`, `GET /installment-plans/{id}`, `PATCH /installments/{id}`
- Chequeras: `POST /checkbooks`, `GET /checkbooks/{id}/pdf`
- Cupones: `POST /coupons/scan`, `POST /coupons/{id}/collect`
- Pagos no efectivos: `POST /payments/non-cash`, `GET /payments/{id}/receipt`
- Reportes: `/reports/passengers`, `/reports/passenger-status`, `/reports/cashbox` (ADMIN), `/reports/provider-profit` (ADMIN)
- Auditoría: `/audit` (ADMIN)

### RBAC y Seguridad

- Middleware `role:ADMIN` para reportes consolidados.
- Policies sugeridas por recurso (Admin/Office/Readonly) y validación estricta vía Form Requests.
- Rate limit recomendado para login con `throttle:10,1`.
- Backups recomendados: snapshots diarios de PostgreSQL + storage de PDFs.
- Datos sensibles (menores): aplicar enmascarado en reportes, cifrado en backups.

### Lógica crítica (servicios)

- `InstallmentPlanService`: genera plan (N ≤ 12), valida suma = total.
- `CheckbookService`: crea chequera + cupones con código único.
- `CouponCollectionService`: cobra cupón en efectivo, ajusta si difiere y audita.
- `NonCashPaymentService`: registra pago no efectivo + genera comprobante X.
- `AugustSurchargeService`: aplica recargo único en agosto si no hay pagos.

### PDF y Code128

Se recomienda integrar un generador PDF (DOMPDF o Snappy) + librería de barcode (ej. `milon/barcode`) para renderizar **Code128** en los cupones. Las rutas `/checkbooks/{id}/pdf` y `/payments/{id}/receipt` están listas para integrarse con el servicio de PDF.

## Frontend (React + Vite)

### Desarrollo

```bash
npm install
npm run dev
```

### Login demo

El frontend incluye un selector rápido de rol para visualizar permisos y navegación. Al conectar con Sanctum, reemplazar con login real.

## Tests mínimos (Backend)

```bash
docker compose exec app php artisan test
```

Incluye:
- DNI único por viaje.
- Cobro de cupón crea pago + movimientos.
- Motivo obligatorio si el monto difiere.
- OFFICE sin acceso a reportes ADMIN.

## Notas

- Dinero en `numeric(12,2)`.
- Timezone: `America/Argentina/Buenos_Aires`.
- Cupones solo para **cobro en efectivo**.
- Pagos no efectivos descuentan saldo pero **no** marcan cupones.
