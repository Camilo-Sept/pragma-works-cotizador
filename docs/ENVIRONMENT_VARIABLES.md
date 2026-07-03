# Variables de ambiente

## Objetivo

Definir las variables necesarias para local, preview y producción sin subir secretos a GitHub.

---

## Archivos permitidos y prohibidos

### Permitido subir

```text
.env.example
```

### Prohibido subir

```text
.env
.env.local
.env.production
.env.development.local
```

---

## Variables propuestas

```env
# Base de datos
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# App
APP_URL="http://localhost:3000"
NODE_ENV="development"

# Auth / sesiones
AUTH_SECRET="cambiar-por-un-secreto-largo"
AUTH_TRUST_HOST="true"

# Seguridad
RATE_LIMIT_ENABLED="true"
LOGIN_MAX_ATTEMPTS="5"
LOGIN_LOCK_MINUTES="15"

# Exportaciones
PDF_EXPORT_ENABLED="true"
CSV_EXPORT_ENABLED="true"
```

---

## Reglas

- `DATABASE_URL` de producción sólo vive en Vercel/Railway.
- El archivo `.env.local` sólo vive en la máquina de desarrollo.
- Nunca pegar variables reales en README, issues, commits o capturas públicas.
- Si un secreto se sube por accidente, se debe rotar inmediatamente.
- Separar credenciales local/preview/producción.

---

## .env.example inicial

Cuando se implemente backend, se agregará un `.env.example` con nombres de variables pero sin valores reales.
