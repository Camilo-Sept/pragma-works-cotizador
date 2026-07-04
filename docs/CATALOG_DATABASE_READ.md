# Sprint 2.5 - Lectura de catálogo desde base de datos

Este sprint empieza a conectar la UI con PostgreSQL sin cambiar todavía el flujo completo de cotizaciones.

## Qué cambia

- Se agrega `GET /api/services` para leer servicios desde la tabla `services`.
- Se agrega `GET /api/pricing-rules/default` para leer las reglas comerciales default desde `pricing_rule_sets`.
- La UI intenta cargar catálogo y reglas desde la base de datos al iniciar.
- Si la base de datos no está disponible, la UI conserva fallback al catálogo local de `data/services.ts` y `data/pricingRules.ts`.

## Qué NO cambia

- Las cotizaciones todavía se guardan en `localStorage`.
- La edición del catálogo sigue siendo local en esta etapa.
- No se agrega login real todavía.
- No se exponen costos internos ni datos sensibles en rutas públicas.

## Requisitos locales

Antes de correr la app:

```bash
nvm use
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

## Validaciones rápidas

```bash
curl http://127.0.0.1:3000/api/services
curl http://127.0.0.1:3000/api/pricing-rules/default
```

También se puede validar desde navegador:

- `http://localhost:3000/api/services`
- `http://localhost:3000/api/pricing-rules/default`

## Nota de diseño

Este sprint es transición segura: se lee desde BD, pero con fallback local. Así no se cae la app si PostgreSQL no está levantado durante desarrollo.
