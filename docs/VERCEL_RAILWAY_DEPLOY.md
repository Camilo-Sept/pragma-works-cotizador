# Deploy Vercel + Railway

Guía práctica para publicar el cotizador con la app Next.js en Vercel y PostgreSQL en Railway.

## Arquitectura

```text
Usuario
  -> Vercel
      - Next.js UI
      - API routes: /api/services, /api/pricing-rules/default, /api/quotes, /api/health
  -> Railway PostgreSQL
      - Prisma schema
      - Catálogo, reglas, clientes, cotizaciones, auditoría
```

## 1. Railway

1. Crear un proyecto nuevo en Railway.
2. Agregar PostgreSQL.
3. Copiar la variable `DATABASE_URL`.
4. Confirmar que la URL tenga `?schema=public`. Si no lo tiene, agregarlo al final.

Ejemplo de forma:

```text
postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public
```

No subir esta URL a GitHub.

## 2. Vercel

1. Crear proyecto nuevo en Vercel.
2. Importar el repo `Camilo-Sept/pragma-works-cotizador`.
3. Framework: Next.js.
4. Build command: `npm run build`.
5. Install command: `npm ci`.
6. Node.js: usar Node 20.
7. Agregar variables de ambiente:

```text
DATABASE_URL=postgresql://...
APP_URL=https://tu-app.vercel.app
NODE_ENV=production
AUTH_SECRET=replace-with-long-random-secret
AUTH_TRUST_HOST=true
RATE_LIMIT_ENABLED=true
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
PDF_EXPORT_ENABLED=true
CSV_EXPORT_ENABLED=true
```

`SHADOW_DATABASE_URL` no es necesaria para runtime en Vercel. Sólo se usa para `prisma migrate dev` en desarrollo.

## 3. Migraciones y seed en Railway

Desde la Mac, usando temporalmente la `DATABASE_URL` de Railway:

```bash
DATABASE_URL="postgresql://..." npm run db:deploy
DATABASE_URL="postgresql://..." npm run db:seed
```

El seed es idempotente: actualiza reglas y servicios existentes.

## 4. Verificaciones

Después del deploy, abrir:

```text
https://tu-app.vercel.app/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "database": "connected"
}
```

Luego abrir la app y validar:

1. Chips `Catálogo: BD` y `Reglas: BD`.
2. Crear cotización.
3. Guardar borrador.
4. Abrir `https://tu-app.vercel.app/api/quotes`.
5. Confirmar que la cotización aparece en BD.

## 5. Si algo falla

- Si `/api/health` responde `503`, revisar `DATABASE_URL` en Vercel.
- Si el build falla con Prisma, revisar que `postinstall` corrió `prisma generate`.
- Si no aparecen servicios, correr `npm run db:seed` contra Railway.
- Si Vercel muestra fallback local, revisar logs de `/api/services` y `/api/pricing-rules/default`.
