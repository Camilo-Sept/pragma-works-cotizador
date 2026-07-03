# Roadmap Sprint 2 — Backend, base de datos y login real

## Estado actual

La app ya tiene validación funcional local:

- Cotizaciones locales.
- PDF de cotización.
- Catálogo editable local.
- Reportes locales.
- Reglas de seguridad documentadas.
- Roles/permisos simulados en UI.

La siguiente etapa es mover la operación a servidor y base de datos.

---

## Sprint 2.1 — PostgreSQL local con Docker

Objetivo:

- Levantar PostgreSQL local sin tocar producción.
- Preparar `docker-compose.yml` sólo para desarrollo.
- Crear `.env.example`.

No incluye:

- Login.
- Producción.
- Deploy.

---

## Sprint 2.2 — Prisma y modelo de datos

Objetivo:

- Instalar/configurar Prisma.
- Crear schema inicial.
- Crear migraciones.
- Crear seed de datos de prueba.

Tablas iniciales:

- users
- clients
- quotes
- quote_items
- service_catalog
- pricing_rules
- audit_logs

---

## Sprint 2.3 — API de cotizaciones

Objetivo:

- Guardar cotizaciones en BD.
- Leer historial desde BD.
- Actualizar estados.
- Crear revisiones.
- Validar reglas en servidor.

---

## Sprint 2.4 — Migración de localStorage a BD

Objetivo:

- Detectar cotizaciones locales.
- Importarlas a BD con confirmación del usuario.
- Evitar duplicados.

---

## Sprint 2.5 — Login real

Objetivo:

- Crear login seguro.
- Manejar sesiones.
- Hash de contraseñas.
- Bloqueo por intentos fallidos.

---

## Sprint 2.6 — Roles reales

Objetivo:

- Validar permisos en servidor.
- Mostrar vistas según rol.
- Bloquear acciones sensibles aunque se manipule la UI.

---

## Sprint 2.7 — Auditoría

Objetivo:

- Registrar acciones sensibles.
- Consultar historial de cambios.
- Guardar antes/después de cambios críticos.

---

## Sprint 2.8 — Deploy Vercel + Railway

Objetivo:

- Configurar Railway PostgreSQL.
- Configurar Vercel.
- Variables de ambiente.
- Prueba preview.
- Producción controlada.

---

## Reglas para no romper el proyecto

- Un sprint a la vez.
- No mezclar login con migraciones.
- No mezclar producción con pruebas locales.
- No subir `.env`.
- No hacer merge si `npm run build` falla.
- No meter Docker de producción todavía.
