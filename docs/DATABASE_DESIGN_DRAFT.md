# Borrador de diseño de base de datos

## Objetivo

Definir las tablas iniciales antes de crear Prisma y migraciones.

Este documento es borrador. El esquema real se implementará en Prisma en el siguiente sprint técnico.

---

## Tablas principales

### users

Usuarios del sistema.

```text
id
name
email
password_hash
role
status
last_login_at
failed_login_attempts
locked_until
created_at
updated_at
```

Roles iniciales:

```text
ADMIN
SUPERVISOR
VENTAS
OPERACION
LECTURA
```

---

### clients

Clientes o prospectos.

```text
id
name
contact_name
email
phone
company
rfc
notes
created_by_user_id
created_at
updated_at
```

---

### quotes

Cotizaciones.

```text
id
folio
revision
status
client_id
client_snapshot
project_name
project_description
mode
source_code_option
valid_until
target_delivery_date
initial_total
monthly_total
annual_total
estimated_hours
created_by_user_id
approved_by_user_id
sent_at
accepted_at
rejected_at
archived_at
created_at
updated_at
```

Estados:

```text
DRAFT
SENT
ACCEPTED
REJECTED
ARCHIVED
```

Reglas:

- `folio` no cambia.
- `revision` aumenta con R2, R3, etc.
- Cotización enviada/aceptada no se edita directo.
- Cambios importantes crean nueva revisión.

---

### quote_items

Conceptos dentro de una cotización.

```text
id
quote_id
service_catalog_id
name
description_for_client
internal_description
category
quantity
unit_price
subtotal
billing_type
estimated_hours
sort_order
created_at
updated_at
```

Regla importante:

El precio y descripción usados en la cotización se guardan como snapshot, aunque después cambie el catálogo.

---

### service_catalog

Catálogo base de servicios.

```text
id
name
category
billing_type
base_price
estimated_hours
description_for_client
internal_description
is_active
created_by_user_id
updated_by_user_id
created_at
updated_at
```

Reglas:

- No borrar servicios usados en cotizaciones.
- Desactivar en vez de eliminar.
- Cambios sensibles quedan auditados.

---

### pricing_rules

Reglas comerciales.

```text
id
key
value
description
updated_by_user_id
created_at
updated_at
```

Ejemplos:

```text
IVA
hora_normal
hora_avanzada
urgente_fuera_horario
renovacion_basica
porcentaje_codigo_fuente
```

---

### audit_logs

Registro de cambios sensibles.

```text
id
user_id
action
entity_type
entity_id
before_json
after_json
ip_address
user_agent
created_at
```

Acciones esperadas:

```text
QUOTE_CREATED
QUOTE_UPDATED
QUOTE_SENT
QUOTE_ACCEPTED
QUOTE_REJECTED
QUOTE_ARCHIVED
QUOTE_REVISION_CREATED
CATALOG_UPDATED
PRICING_RULE_UPDATED
USER_CREATED
USER_ROLE_CHANGED
LOGIN_SUCCESS
LOGIN_FAILED
```

---

### discount_approvals

Aprobaciones de descuentos.

```text
id
quote_id
requested_by_user_id
approved_by_user_id
discount_percent
reason
status
created_at
updated_at
```

Estados:

```text
PENDING
APPROVED
REJECTED
```

---

## Relaciones principales

```text
users 1 → N quotes
clients 1 → N quotes
quotes 1 → N quote_items
service_catalog 1 → N quote_items
quotes 1 → N audit_logs
users 1 → N audit_logs
quotes 1 → N discount_approvals
```

---

## Índices sugeridos

```text
users.email único
quotes.folio + revision único
quotes.status
quotes.created_by_user_id
quotes.client_id
quotes.valid_until
quotes.target_delivery_date
audit_logs.entity_type + entity_id
audit_logs.user_id
audit_logs.created_at
```

---

## Datos que deben protegerse

- Usuarios.
- Correos.
- Teléfonos.
- Cotizaciones.
- Precios.
- Reglas de precio.
- Descuentos.
- Auditoría.
- Tokens/sesiones.

---

## Pendientes antes de Prisma

- Confirmar si `client_snapshot` se guarda como JSON.
- Confirmar si los descuentos serán por cotización completa o por concepto.
- Confirmar si se manejará IVA dentro del sistema o sólo como nota.
- Confirmar si `OPERACION` verá precios o sólo alcance/fechas.
- Confirmar si habrá multiempresa en el futuro.
