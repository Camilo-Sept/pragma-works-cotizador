# Plan de despliegue — Vercel + Railway

## Objetivo

Definir cómo se desplegará el cotizador cuando pase de app local a app con backend, base de datos, usuarios y datos reales.

---

## Arquitectura inicial de producción

```text
Dominio
  ↓
Vercel
  - App Next.js
  - API Routes / Server Actions
  - Login
  - Roles
  - Validaciones
  - Rate limit
  ↓
Railway PostgreSQL
  - Base de datos productiva
  - Backups
  - Credenciales seguras
```

---

## Vercel

Uso:

- Hospedar la app Next.js.
- Ejecutar rutas backend de Next.js.
- Configurar variables de ambiente.
- Manejar despliegues por rama.
- Usar dominio personalizado cuando aplique.

Variables probables:

```text
DATABASE_URL
APP_URL
AUTH_SECRET
AUTH_TRUST_HOST
NODE_ENV
```

Reglas:

- No configurar secretos en código.
- No subir `.env.local`.
- Las variables de producción se configuran en el panel de Vercel.
- Las variables de preview deben ser distintas a producción cuando sea posible.

---

## Railway PostgreSQL

Uso:

- Base de datos PostgreSQL.
- Guardar clientes, cotizaciones, usuarios, permisos y auditoría.
- Conectarse desde Vercel mediante `DATABASE_URL`.

Reglas:

- Usar una base para producción.
- Usar otra base para pruebas/desarrollo si se puede.
- Activar backups si el plan lo permite.
- No compartir credenciales por WhatsApp/correo sin control.
- Rotar credenciales si se sospecha fuga.

---

## Desarrollo local

Para evitar tocar producción mientras se programa:

```text
Next.js local
PostgreSQL local con Docker
.env.local local
Datos ficticios
```

---

## Flujo GitHub → Vercel

Propuesta:

```text
main = producción estable
sprint-* = ramas de desarrollo
Pull Request = revisión
Merge a main = despliegue a producción o preview controlado
```

Antes de conectar despliegue automático a producción, confirmar:

- Builds pasan.
- Variables de ambiente configuradas.
- Migraciones controladas.
- No hay datos reales en seed/test.
- No se imprimen secretos en logs.

---

## Estrategia de despliegue por etapas

### Etapa 1: App local con BD local

- Docker local.
- Prisma.
- Migraciones.
- APIs locales.

### Etapa 2: App en Vercel con BD de pruebas

- Deploy preview.
- Base Railway de pruebas.
- Usuarios de prueba.

### Etapa 3: Producción controlada

- Base de producción.
- Usuarios reales.
- Backups.
- Auditoría.
- Dominio.

---

## Rollback

Si algo falla en producción:

- Revertir despliegue en Vercel.
- No borrar base de datos.
- Revisar logs.
- Revisar migraciones aplicadas.
- Restaurar backup sólo si es necesario.

---

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Se sube `.env` a GitHub | `.gitignore`, revisión antes de commit. |
| Se rompe producción con migración | Migraciones probadas en local y preview. |
| Se filtra `DATABASE_URL` | Variables sólo en Vercel/Railway. |
| Ataques de login | Rate limit y bloqueo por intentos. |
| Pérdida de datos | Backups automáticos. |
| Usuario sin permiso modifica datos | Validación de permisos en servidor. |
