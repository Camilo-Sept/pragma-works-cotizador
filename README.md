# Pragma Works Cotizador Pro - UI V1

Cotizador comercial para servicios de software, automatización, soporte e IA.

La app ya incluye UI local, catálogo, reglas comerciales, historial local, reportes, vista/PDF desde navegador, PostgreSQL local con Docker, Prisma, seed inicial, sincronización de cotizaciones a BD con fallback local, login básico real, usuarios en base de datos, contraseña hasheada, cookie `httpOnly` y validación server-side en rutas API protegidas.

## Stack

- Next.js
- React
- TypeScript
- CSS puro
- Prisma
- PostgreSQL
- Docker Compose para desarrollo local
- localStorage como guardado inmediato/fallback
- API routes de Next.js para catálogo, reglas, cotizaciones, autenticación y healthcheck

## Qué incluye esta V1

- Pantalla de nueva cotización.
- Datos de cliente/prospecto.
- Modalidad comercial:
  - Venta única.
  - Renta mensual.
  - Híbrido.
- Código fuente con recargo:
  - No incluido.
  - Entrega al liquidar.
  - Compra total.
- Catálogo local de servicios y módulos.
- Catálogo editable desde UI para agregar, editar, activar/desactivar y ajustar precios.
- Buscador inteligente de conceptos.
- Alta rápida de conceptos desde la cotización.
- Opción para guardar conceptos nuevos en catálogo local del navegador.
- Anulaciones locales para ajustar servicios base sin modificar código.
- Cálculo automático de:
  - pago inicial,
  - mensualidad,
  - renovación anual,
  - ajustes comerciales,
  - horas estimadas.
- Resumen listo para copiar a WhatsApp.
- Guardado local de cotizaciones en `localStorage`.
- Historial de cotizaciones recientes.
- Reportes locales desde cotizaciones guardadas.
- Filtros de reportes por estado, modalidad, fecha y búsqueda, con indicador visible de filtros aplicados.
- KPIs útiles de dinero aceptado, mensualidad aceptada, renovación anual, trabajo aceptado y propuestas por cerrar.
- Seguimiento de cotizaciones por vencer y vencidas.
- Fecha objetivo de entrega por proyecto.
- Tablas de proyectos por entregar, vencimientos y cotizaciones con dinero por cerrar.
- Exportación CSV de reportes locales.
- Impresión / guardado como PDF del reporte desde el navegador.
- Folio automático tipo `PW-000001`.
- Estados: borrador, enviada, aceptada y rechazada.
- Duplicar, abrir y eliminar cotizaciones guardadas.
- Disclaimer de confidencialidad.
- Sección de reglas de precio editables en pantalla.
- Sección con comandos sugeridos para GitHub.
- Catálogo y reglas desde PostgreSQL con fallback local.
- Guardado local de cotizaciones y sincronización posterior a PostgreSQL.
- Endpoint `/api/health` para validar conexión con base de datos.
- Login básico real con usuarios persistidos en base de datos.
- Contraseñas almacenadas con hash PBKDF2.
- Sesión por cookie `httpOnly` firmada.
- APIs protegidas con validación server-side de sesión y rol.
- Seed seguro para producción: no crea usuarios demo fijos en `NODE_ENV=production`.

## Qué NO incluye todavía

- Panel administrativo para alta, baja y edición de usuarios.
- Recuperación/restablecimiento de contraseña.
- Rate limit persistente avanzado para login.
- PDF generado con librería dedicada.
- PWA instalable.

Los permisos ya se validan en backend para rutas críticas, pero la administración completa de usuarios queda para un sprint posterior.

## Cómo correr localmente

Desde la carpeta del proyecto:

```bash
nvm use
npm install
docker compose up -d
npm run db:seed
npm run dev
```

Luego abrir:

```text
http://localhost:3000
```

## Comandos útiles

```bash
npm run typecheck
npm run build
npm run db:validate
npm run db:deploy
npm run db:seed
```

## Deploy

La ruta recomendada es:

- Vercel para la app Next.js completa.
- Railway PostgreSQL para la base de datos.
- Variables de ambiente configuradas en Vercel, no en GitHub.

Ver:

- `docs/VERCEL_RAILWAY_DEPLOY.md`
- `docs/DEMO_CHECKLIST.md`

## Estructura principal

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  CotizadorApp.tsx
data/
  company.ts
  pricingRules.ts
  services.ts
lib/
  pricing.ts
  prisma.ts
  quoteDatabaseClient.ts
prisma/
  schema.prisma
  migrations/
  seed.js
types/
  quote.ts
```

## Preparar para GitHub

```bash
git init
git add .
git commit -m "feat: crear cotizador ui v1"
```

Crear el repo en GitHub y luego conectar:

```bash
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

## Reglas importantes del proyecto

- No subir `node_modules`.
- No subir `.next`.
- No subir `.env`.
- No meter contraseñas ni secretos al repo.
- No mostrar credenciales demo en la pantalla de login.
- En producción, usar siempre un `AUTH_SECRET` único, fuerte y diferente al de desarrollo.
- Hacer commits pequeños por funcionalidad.

## Próximos sprints sugeridos

### Sprint 1.1

Completado en rama de trabajo local:

- Guardar cotizaciones en localStorage.
- Listar cotizaciones recientes.
- Duplicar cotización.
- Marcar cotización como borrador/enviada/aceptada/rechazada.
- Folio automático y vigencia.

### Sprint 1.2

- Vista imprimible. ✅
- Opción de imprimir / guardar como PDF desde el navegador. ✅
- Plantilla formal de cotización. ✅

### Sprint 1.3

- Catálogo editable desde UI. ✅
- Crear nuevos servicios desde el módulo de catálogo. ✅
- Editar precio, categoría, tipo de cobro, horas y descripciones. ✅
- Activar/desactivar servicios del buscador. ✅
- Restaurar servicios base ajustados. ✅

### Sprint 1.4

- Reportes simples desde historial local. ✅
- Filtros por estado, modalidad, fechas y búsqueda. ✅
- Totales por estatus y KPIs comerciales. ✅
- Exportación CSV del reporte filtrado. ✅

### Sprint 1.5

- Plantillas comerciales editables.
- Textos configurables para condiciones y alcance.
- Preparar terreno para usuarios y permisos.

### Sprint 2.0 - Base de datos y deploy

- Docker. ✅
- PostgreSQL. ✅
- Prisma. ✅
- Deploy Vercel + Railway. ✅
- Catálogo y reglas desde base de datos. ✅
- Cotizaciones sincronizadas a base de datos. ✅

### Sprint 2.7 - Cierre de seguridad backend

- Login básico real con usuarios de base de datos. ✅
- Contraseñas hasheadas. ✅
- Cookie `httpOnly` firmada. ✅
- `AUTH_SECRET` obligatorio y fuerte en producción. ✅
- APIs protegidas por sesión. ✅
- Permisos reales en backend para guardar/aceptar/rechazar cotizaciones. ✅
- Auditoría con usuario autenticado. ✅
- Seed seguro para producción. ✅

### Sprint 2.8 sugerido

- Panel administrativo de usuarios.
- Cambio y recuperación de contraseña.
- Rate limit persistente con base de datos o Redis.
- CRUD de catálogo y reglas en servidor.
- PDF dedicado con librería.
- PWA instalable.
