# Sprint 2.1 — PostgreSQL local con Docker

Este documento explica cómo levantar una base de datos local para desarrollo del cotizador.

## Objetivo

Preparar PostgreSQL local sin conectar todavía la app a la base de datos.

En este sprint la app puede seguir trabajando con `localStorage`. La base de datos queda lista para el siguiente sprint, donde se agregará Prisma y el modelo inicial.

## Arquitectura local

```text
Mac / desarrollo
  ├─ Next.js en http://localhost:3000
  └─ PostgreSQL en Docker
       ├─ contenedor: pragma-works-postgres
       ├─ base: pragma_works_cotizador
       ├─ usuario: postgres
       ├─ password: postgres
       └─ puerto: 5432
```

## Seguridad importante

Esta configuración es sólo para desarrollo local.

No usar estas credenciales en producción:

```text
usuario: postgres
password: postgres
puerto abierto local: 5432
```

En producción la base de datos vivirá en Railway PostgreSQL y sus credenciales reales se guardarán en variables de ambiente, nunca en GitHub.

## Levantar PostgreSQL

Desde la raíz del proyecto:

```bash
docker compose up -d
```

Verificar contenedor:

```bash
docker ps
```

Debe aparecer:

```text
pragma-works-postgres
```

## Validar salud del contenedor

```bash
docker inspect --format='{{json .State.Health}}' pragma-works-postgres
```

Si está correcto debe mostrar algo relacionado con:

```text
"Status":"healthy"
```

## Entrar a la base de datos

```bash
docker exec -it pragma-works-postgres psql -U postgres -d pragma_works_cotizador
```

Dentro de `psql`, probar:

```sql
SELECT current_database();
SELECT version();
\dt
```

Para salir:

```sql
\q
```

## Apagar la base de datos sin borrar datos

```bash
docker compose down
```

Los datos se quedan guardados en el volumen:

```text
pragma_works_postgres_data
```

## Borrar todo y empezar limpio

Usar sólo si no importa borrar la base local de desarrollo:

```bash
docker compose down -v
```

Esto elimina el volumen y borra los datos locales.

## Si ya existe un contenedor con el mismo nombre

Si `docker compose up -d` marca error porque ya existe `pragma-works-postgres`, revisar primero:

```bash
docker ps -a | grep pragma-works-postgres
```

Si es un contenedor viejo de pruebas y no tiene datos importantes:

```bash
docker stop pragma-works-postgres
docker rm pragma-works-postgres
docker compose up -d
```

## Variables de ambiente

El archivo `.env.example` documenta la URL local esperada:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pragma_works_cotizador?schema=public"
```

Para trabajar localmente, cuando el backend lo necesite, se creará `.env.local` con esa misma estructura.

## Qué NO hace este sprint

Este sprint no agrega todavía:

- Prisma.
- Migraciones.
- Tablas reales.
- Login.
- Usuarios.
- Guardado de cotizaciones en BD.
- Conexión a Railway.
- Deploy en Vercel.

## Próximo sprint

Sprint 2.2:

- Instalar Prisma.
- Crear `prisma/schema.prisma`.
- Definir modelos iniciales.
- Ejecutar primera migración local.
