# Sprint 2.2 — Prisma y esquema inicial

Este sprint agrega Prisma como capa de acceso a PostgreSQL y define el primer esquema de base de datos.

## Qué incluye

- Dependencias `prisma` y `@prisma/client` con versión fija.
- Scripts `db:*` en `package.json`.
- `prisma/schema.prisma` con modelos iniciales.
- `lib/prisma.ts` con singleton seguro para desarrollo en Next.js.

## Qué NO incluye todavía

- Login real.
- Guardado de cotizaciones desde la UI.
- Migración de datos de `localStorage` a PostgreSQL.
- Seed de catálogo.
- Deploy en Vercel/Railway.

## Orden correcto de prueba

1. Confirmar que PostgreSQL está arriba.

```bash
docker compose up -d
docker ps
```

2. Instalar dependencias nuevas.

```bash
npm install
```

3. Validar Prisma.

```bash
npm run db:validate
```

4. Generar cliente Prisma.

```bash
npm run db:generate
```

5. Crear la primera migración local.

```bash
npm run db:migrate -- --name init
```

Este comando crea una carpeta dentro de `prisma/migrations/`. Esa carpeta sí se debe subir a GitHub porque representa el cambio real de estructura de base de datos.

6. Confirmar tablas.

```bash
docker exec -it pragma-works-postgres psql -U postgres -d pragma_works_cotizador
```

Dentro de PostgreSQL:

```sql
\dt
```

Para salir:

```sql
\q
```

7. Validar TypeScript y build.

```bash
npm run typecheck
npm run build
```

## Reglas de seguridad aplicadas

- No se escribe SQL manual todavía.
- No se concatena ningún dato del usuario en consultas SQL.
- Los totales monetarios usan `Decimal`, no `Float`.
- Las reglas comerciales de la cotización se guardan como snapshot para evitar que un cambio de catálogo modifique cotizaciones enviadas.
- Las cotizaciones bloqueadas deberán modificarse por revisión, no por edición directa.
- Las acciones importantes tendrán registro en `audit_logs` cuando implementemos backend real.

## Nota importante

Después de correr la migración, revisa `git status`. Debes ver cambios en:

- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `prisma/migrations/.../migration.sql`
- `lib/prisma.ts`
- `docs/PRISMA_SETUP.md`
