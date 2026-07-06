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
AUTH_SECRET=usa-un-secreto-unico-fuerte-de-minimo-32-caracteres
AUTH_TRUST_HOST=true
RATE_LIMIT_ENABLED=true
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
PDF_EXPORT_ENABLED=true
CSV_EXPORT_ENABLED=true

# Opcional sólo para crear el primer admin durante el seed de producción
SEED_ADMIN_EMAIL=admin@tu-dominio.com
SEED_ADMIN_PASSWORD=usa-un-password-temporal-fuerte
SEED_ADMIN_NAME=Administrador
```

`SHADOW_DATABASE_URL` no es necesaria para runtime en Vercel. Sólo se usa para `prisma migrate dev` en desarrollo.

`AUTH_SECRET` es obligatorio en producción. Debe ser único, fuerte y de mínimo 32 caracteres.

En producción, el seed no crea usuarios demo fijos. Sólo crea o actualiza un administrador inicial si existen `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.

## 3. Migraciones y seed en Railway

Desde la Mac, usando temporalmente la `DATABASE_URL` de Railway:

```bash
DATABASE_URL="postgresql://..." npm run db:deploy
DATABASE_URL="postgresql://..." npm run db:seed
```

El seed es idempotente: actualiza reglas y servicios existentes. En producción no crea usuarios demo fijos; sólo crea o actualiza el admin inicial si se configuraron las variables `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.

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

1. Abrir la app y confirmar que solicita login.
2. Confirmar que no se muestran credenciales demo en pantalla.
3. Iniciar sesión con un usuario válido.
4. Confirmar chips `Catálogo: BD` y `Reglas: BD`.
5. Crear cotización.
6. Guardar borrador.
7. Abrir `https://tu-app.vercel.app/api/quotes` con sesión activa.
8. Confirmar que la cotización aparece en BD.
9. Abrir `https://tu-app.vercel.app/api/quotes` sin sesión, por ejemplo en incógnito, y confirmar que responde error de sesión.

## 5. Si algo falla

- Si `/api/health` responde `503`, revisar `DATABASE_URL` en Vercel.
- Si el build falla con Prisma, revisar que `postinstall` corrió `prisma generate`.
- Si no aparecen servicios, correr `npm run db:seed` contra Railway.
- Si Vercel muestra fallback local, revisar logs de `/api/services` y `/api/pricing-rules/default`.
- Si el login falla en producción, revisar `AUTH_SECRET` y que existan usuarios activos en la tabla `User`.
- Si el seed no crea admin en producción, revisar que existan `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.
