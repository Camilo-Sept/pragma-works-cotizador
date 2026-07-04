# Sprint 2.5 - Catálogo desde base de datos

## Objetivo

Conectar el catálogo base y las reglas comerciales default desde PostgreSQL usando Prisma y rutas API de Next.js.

## Archivos agregados

- `app/api/services/route.ts`
- `app/api/pricing-rules/default/route.ts`
- `docs/CATALOG_DATABASE_READ.md`
- `docs/SPRINT_2_5_SUMMARY.md`

## Archivos modificados

- `components/CotizadorApp.tsx`

## Comportamiento esperado

1. Al abrir la app, intenta leer servicios desde `/api/services`.
2. Si la lectura funciona, el buscador usa datos de PostgreSQL.
3. Si la lectura falla, usa el catálogo local como respaldo.
4. Al abrir la app, intenta leer reglas default desde `/api/pricing-rules/default`.
5. Si la lectura falla, conserva las reglas locales actuales.

## Pruebas sugeridas

```bash
nvm use
docker compose up -d
npm run db:validate
npm run db:seed
npm run typecheck
npm run build
npm run dev
```

Validación API:

```bash
curl http://127.0.0.1:3000/api/services
curl http://127.0.0.1:3000/api/pricing-rules/default
```

## Siguiente paso recomendado

Sprint 2.6: guardar cotizaciones en base de datos, manteniendo fallback temporal a `localStorage` mientras se valida el flujo.
