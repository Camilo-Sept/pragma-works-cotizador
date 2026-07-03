# Sprint 2.0-plan — Arquitectura backend y base de datos

## Objetivo

Definir la arquitectura técnica antes de agregar backend, base de datos, login real, roles reales y despliegue en producción.

La app actual funciona como validación local con `localStorage`. La siguiente etapa debe mover la información importante a servidor y base de datos, cuidando seguridad, permisos y auditoría.

---

## Arquitectura propuesta

```text
Usuario
  ↓
Vercel
  - Next.js App
  - Frontend
  - API Routes / Server Actions
  - Validaciones de servidor
  - Login y sesiones
  - Roles y permisos
  - Generación de PDF / exportaciones
  - Rate limit en rutas sensibles
  ↓
Railway PostgreSQL
  - Clientes
  - Cotizaciones
  - Conceptos cotizados
  - Usuarios
  - Roles
  - Auditoría
  - Configuración comercial
```

### Decisión inicial

| Componente | Tecnología propuesta | Motivo |
|---|---|---|
| Frontend | Next.js en Vercel | El proyecto ya está en Next.js y Vercel simplifica despliegue. |
| Backend inicial | API Routes / Server Actions de Next.js | Evita separar backend prematuramente. |
| Base de datos | PostgreSQL en Railway | Base relacional sólida para cotizaciones, usuarios y auditoría. |
| ORM | Prisma | Tipado, migraciones y consultas parametrizadas. |
| Desarrollo local | PostgreSQL con Docker | Permite probar sin tocar datos reales. |
| Producción inicial | Vercel + Railway | Menos infraestructura que administrar al inicio. |

---

## Qué NO se va a hacer todavía

- No separar backend en Render/Nest/Express todavía.
- No meter Docker para producción inicial.
- No exponer PostgreSQL públicamente sin restricciones.
- No subir `.env` a GitHub.
- No crear login falso sólo con `localStorage`.
- No confiar permisos solamente a la interfaz.
- No guardar contraseñas en texto plano.
- No usar SQL concatenado con datos del usuario.

---

## Ambientes

### Local

Uso para desarrollo.

```text
Next.js local
PostgreSQL local en Docker
.env.local local
Datos de prueba
```

### Preview / pruebas

Uso para revisar Pull Requests o builds previos a producción.

```text
Vercel Preview
Base de datos de prueba o rama separada
Variables de ambiente de prueba
Datos no reales
```

### Producción

Uso real con clientes y dinero.

```text
Vercel Production
Railway PostgreSQL Production
Variables de ambiente de producción
Backups activos
Auditoría activa
```

---

## Principios de seguridad

### 1. Validación doble

La interfaz puede bloquear botones, pero la seguridad real debe vivir en el servidor.

```text
UI = ayuda visual
Servidor = autoridad real
Base de datos = persistencia
Auditoría = evidencia
```

### 2. Permisos por rol

Los permisos deben validarse en cada acción sensible.

Ejemplos:

- Crear cotización.
- Editar cotización.
- Cambiar estado.
- Aprobar descuento.
- Editar catálogo.
- Ver reportes.
- Exportar PDF/CSV.
- Archivar cotización.
- Crear usuarios.

### 3. Datos congelados

Cuando una cotización se envía o acepta, los precios usados deben quedarse guardados aunque el catálogo cambie después.

### 4. Auditoría obligatoria

Toda acción sensible debe registrar:

```text
quién hizo el cambio
qué cambió
cuándo cambió
desde dónde cambió
estado anterior
estado nuevo
```

### 5. Secretos protegidos

No se deben subir a GitHub:

- `DATABASE_URL`
- `NEXTAUTH_SECRET` o secreto equivalente
- claves privadas
- tokens
- credenciales de Railway/Vercel
- passwords

---

## Defensa contra SQL Injection

Reglas obligatorias:

- Usar Prisma o consultas parametrizadas.
- No concatenar texto para crear SQL.
- Validar entradas con esquemas.
- Usar listas permitidas para campos como estado, modalidad, rol y tipo de cobro.
- Usar usuario de base de datos con permisos limitados.
- No dar permisos administrativos a la cuenta usada por la app.

Ejemplo de lo que NO se debe hacer:

```ts
// Prohibido
const query = `SELECT * FROM quotes WHERE client = '${clientName}'`;
```

Ejemplo esperado:

```ts
// Correcto con ORM/consulta segura
await prisma.quote.findMany({
  where: {
    clientName,
  },
});
```

---

## Defensa contra DDoS, bots y abuso

No existe un antídoto único. La defensa debe ser por capas:

```text
Vercel Firewall / protección de plataforma
Rate limit en rutas sensibles
Límites de tamaño de request
Bloqueo por intentos fallidos
Validación de payloads
Timeouts
Logs
Alertas
Backups
```

Rutas con especial cuidado:

- Login.
- Crear cotización.
- Actualizar cotización.
- Exportar PDF.
- Exportar CSV.
- Búsquedas con filtros.
- Rutas administrativas.

---

## Esquema funcional de módulos

### Usuarios

- Login.
- Roles.
- Estado activo/inactivo.
- Último acceso.
- Intentos fallidos.

### Clientes

- Razón social / nombre.
- Contacto.
- Correo.
- Teléfono.
- RFC opcional.
- Notas.

### Cotizaciones

- Folio.
- Revisión.
- Estado.
- Cliente.
- Proyecto.
- Vigencia.
- Fecha objetivo de entrega.
- Modalidad.
- Totales.
- Usuario creador.
- Usuario que aprobó.

### Conceptos cotizados

- Nombre del servicio.
- Descripción.
- Cantidad.
- Precio unitario congelado.
- Subtotal.
- Tipo de cobro.
- Horas estimadas.

### Catálogo

- Servicios base.
- Servicios activos/inactivos.
- Precio base.
- Tipo de cobro.
- Categoría.
- Descripción interna.
- Descripción para cliente.

### Auditoría

- Entidad afectada.
- Acción.
- Usuario.
- Antes.
- Después.
- Fecha/hora.
- IP/user agent si aplica.

---

## Orden de implementación recomendado

```text
Sprint 2.1 — Docker local + PostgreSQL local
Sprint 2.2 — Prisma + modelo de datos
Sprint 2.3 — API para guardar cotizaciones en BD
Sprint 2.4 — Migrar historial local a BD
Sprint 2.5 — Login real
Sprint 2.6 — Roles reales y permisos de servidor
Sprint 2.7 — Auditoría
Sprint 2.8 — Deploy Vercel + Railway
```

---

## Criterio de avance

No se debe avanzar a login real hasta que existan:

- Base de datos.
- Modelo de usuarios.
- Modelo de roles.
- Sesiones seguras.
- Validación de permisos en servidor.

No se debe avanzar a producción hasta que existan:

- Variables seguras.
- Backups.
- Rate limit.
- Auditoría.
- Checklist de seguridad revisado.
