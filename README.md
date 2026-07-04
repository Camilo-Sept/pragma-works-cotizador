# Pragma Works Cotizador Pro - UI V1

Cotizador comercial para servicios de software, automatización, soporte e IA.

La app ya incluye UI local, catálogo, reglas comerciales, historial local, reportes, vista/PDF desde navegador, roles simulados, PostgreSQL local con Docker, Prisma, seed inicial y sincronización de cotizaciones a BD con fallback local.

## Stack

- Next.js
- React
- TypeScript
- CSS puro
- Prisma
- PostgreSQL
- Docker Compose para desarrollo local
- localStorage como guardado inmediato/fallback
- API routes de Next.js para catálogo, reglas, cotizaciones y healthcheck

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

## Qué NO incluye todavía

- Autenticación real.
- Roles de servidor.
- PDF generado con librería dedicada.
- PWA instalable.

Los roles actuales son simulados en UI. El login real queda para un sprint posterior.

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

### Sprint 2

- Login.
- Roles.
- Base de datos.
- Catálogo administrable en servidor.

### Sprint 3

- Docker.
- PostgreSQL.
- Deploy.
- PWA instalable.

## Completado en Sprint 1.6

- Simulación local de roles: ADMIN, SUPERVISOR, VENTAS, OPERACIÓN y LECTURA.
- Pestañas visibles según rol.
- Candados de negocio para cotizaciones enviadas, aceptadas y rechazadas.
- Creación de revisiones R2/R3 para modificar cotizaciones bloqueadas.
- Bloqueo de eliminación para cotizaciones enviadas o aceptadas; se archivan en lugar de borrar.
- Bloqueo de edición de catálogo y reglas para roles sin permiso.
- Nueva pestaña **Seguridad / roles** con matriz de permisos y reglas aplicadas.
- Preparación conceptual para login real con backend.

> Nota: estos permisos todavía son de interfaz local. La seguridad real debe validarse en backend con sesiones, roles, auditoría, rate limits y base de datos.
