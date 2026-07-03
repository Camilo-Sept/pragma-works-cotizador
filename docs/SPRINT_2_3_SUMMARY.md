# Sprint 2.3 - Seed inicial de catálogo y reglas

## Objetivo

Cargar datos base en PostgreSQL local sin conectar todavía la UI a la base de datos.

## Incluye

- Script `prisma/seed.js`.
- Script npm `db:seed`.
- Configuración `prisma.seed` en `package.json`.
- Reglas comerciales base.
- Catálogo inicial de servicios.
- Documentación en `docs/SEED_DATA.md`.

## No incluye

- Login real.
- Usuarios reales.
- Clientes reales.
- Cotizaciones reales.
- API routes.
- Conexión de la UI con Prisma.

## Pruebas sugeridas

```bash
nvm use
npm run db:validate
npm run db:seed
npm run typecheck
npm run build
```
