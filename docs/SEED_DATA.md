# Seed inicial de datos locales

Este sprint agrega un seed inicial para cargar datos base en PostgreSQL local.

## Qué carga

- Un set de reglas comerciales base.
- El catálogo inicial de servicios usado actualmente por la UI local.

## Qué NO carga

- Usuarios reales.
- Contraseñas.
- Clientes reales.
- Cotizaciones reales.
- Información sensible.

## Por qué no se cargan usuarios todavía

El login real todavía no está implementado. Crear usuarios con contraseñas de prueba antes de definir autenticación puede generar malas prácticas o datos basura. Los usuarios se sembrarán cuando se implemente el módulo de autenticación.

## Comando

```bash
npm run db:seed
```

## Requisitos

Antes de ejecutar el seed, la base debe estar migrada:

```bash
npm run db:migrate -- --name init
```

El contenedor local debe estar vivo:

```bash
docker compose up -d
```

## Validación rápida

```bash
docker exec -it pragma-works-postgres psql -U pragma_app -d pragma_works_cotizador -c "SELECT COUNT(*) FROM services;"
docker exec -it pragma-works-postgres psql -U pragma_app -d pragma_works_cotizador -c "SELECT name, is_default FROM pricing_rule_sets;"
```

## Idempotencia

El seed se puede correr más de una vez. Si el servicio ya existe por nombre y origen `catalog`, lo actualiza. Si no existe, lo crea.

Esto evita duplicados simples durante desarrollo local.
