# Guía de estilo de código y comentarios

Proyecto: **Pragma Works Cotizador**  
Objetivo: mantener el código entendible, seguro y fácil de mantener antes de crecer a backend, base de datos, login y producción.

---

## 1. Principio general

El código debe poder entenderse por:

1. nombres claros,
2. estructura ordenada,
3. tipos bien definidos,
4. comentarios sólo donde realmente agregan contexto.

No queremos un código lleno de comentarios obvios. Queremos comentarios útiles en partes donde puede haber riesgo de negocio, seguridad, dinero o pérdida de datos.

---

## 2. Cuándo sí comentar

Se debe comentar cualquier bloque relacionado con:

- permisos por rol,
- reglas de negocio,
- dinero,
- descuentos,
- estados de cotización,
- bloqueo de edición,
- creación de revisiones R2/R3,
- eliminación o archivado de datos,
- generación de PDF para cliente,
- separación de información interna vs información pública,
- validaciones de seguridad,
- login, sesiones y tokens,
- rate limit,
- auditoría,
- consultas a base de datos,
- migraciones,
- manejo de errores críticos,
- configuración de producción,
- cualquier regla que exista para evitar fraude, pérdida de datos o fuga de información.

Ejemplo correcto:

```ts
// Una cotización aceptada no debe editarse directamente.
// Si requiere cambios, se debe crear una nueva revisión para conservar historial comercial y auditoría.
if (quote.status === "accepted") {
  return createQuoteRevision(quote);
}
```

---

## 3. Cuándo no comentar

No se deben agregar comentarios obvios como:

```ts
// Cambia el estado a enviado
setStatus("sent");
```

```ts
// Renderiza el botón
<button>Guardar</button>
```

```ts
// Suma dos números
const total = subtotal + tax;
```

Si el comentario sólo repite lo que el código ya dice, no ayuda.

---

## 4. Regla para funciones

Las funciones deben tener nombres claros y orientados a acción.

Preferido:

```ts
createQuoteRevision()
canEditQuote()
archiveClosedQuote()
calculateAcceptedMonthlyRevenue()
```

Evitar:

```ts
processData()
doThing()
handleStuff()
fixQuote()
```

Cuando una función aplique una regla importante, debe tener comentario breve.

```ts
// Regla comercial: sólo ADMIN o SUPERVISOR pueden aprobar descuentos mayores al límite permitido.
function canApproveDiscount(role: UserRole, discountPercent: number) {
  // ...
}
```

---

## 5. Reglas para permisos

Toda regla de permisos debe ser explícita y fácil de auditar.

No usar validaciones escondidas en botones solamente. El frontend puede ocultar botones para ayudar al usuario, pero el backend debe volver a validar permisos.

Ejemplo correcto para futuro backend:

```ts
// Seguridad: ocultar un botón en la UI no es suficiente.
// Esta validación debe repetirse en servidor antes de modificar datos reales.
if (!canEditCatalog(currentUser.role)) {
  throw new ForbiddenError("No tienes permiso para editar el catálogo.");
}
```

---

## 6. Reglas para dinero

Cualquier cálculo relacionado con dinero debe:

- usar nombres claros,
- evitar números mágicos,
- indicar si incluye IVA o no,
- conservar el precio usado en la cotización aunque cambie el catálogo después,
- documentar la regla cuando afecte descuentos, mensualidades o renovaciones.

Ejemplo:

```ts
// El precio de la partida queda congelado al guardar la cotización.
// Cambios posteriores en el catálogo no deben alterar cotizaciones ya enviadas.
const lockedUnitPrice = selectedService.basePrice;
```

---

## 7. Reglas para datos internos vs cliente

La app debe separar información interna de información para cliente.

Información que no debe salir en PDF de cliente:

- margen interno,
- costo interno,
- notas internas,
- lógica de descuento interna,
- horas internas si no se decide mostrar al cliente,
- datos técnicos sensibles,
- IDs internos,
- historial de auditoría.

Si una función exporta PDF, CSV o datos externos, debe comentarse qué información incluye y qué información excluye.

---

## 8. Seguridad contra SQL Injection

Cuando se conecte base de datos:

- no concatenar SQL con texto del usuario,
- usar Prisma o consultas parametrizadas,
- validar entradas,
- limitar permisos del usuario de base de datos,
- no exponer errores SQL crudos al usuario.

Ejemplo de lo que NO debe hacerse:

```ts
// MAL: nunca armar SQL pegando valores del usuario.
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

Ejemplo esperado:

```ts
// Seguridad: Prisma parametriza la consulta y evita concatenar SQL manualmente.
const user = await prisma.user.findUnique({
  where: { email },
});
```

---

## 9. Seguridad contra abuso, bots y DDoS

El código debe prepararse para defensa por capas:

- rate limit en login,
- rate limit en APIs sensibles,
- límite de tamaño de payload,
- bloqueo por intentos fallidos,
- logs de actividad sospechosa,
- validación de origen cuando aplique,
- protección WAF/CDN en producción,
- no exponer la base de datos a internet.

Comentarios obligatorios cuando una ruta tenga rate limit o manejo de abuso:

```ts
// Seguridad: esta ruta tiene rate limit porque puede generar carga alta y exportar información sensible.
```

---

## 10. Manejo de errores

Los errores deben ser útiles para el desarrollador, pero seguros para el usuario.

No mostrar al usuario:

- stack traces,
- secretos,
- cadenas de conexión,
- errores SQL crudos,
- tokens,
- rutas internas del servidor.

Sí registrar internamente:

- usuario,
- acción,
- fecha/hora,
- módulo,
- error técnico,
- contexto no sensible.

---

## 11. Variables de ambiente y secretos

Nunca subir a GitHub:

- `.env`,
- `.env.local`,
- contraseñas,
- tokens,
- `DATABASE_URL` real,
- claves de sesión,
- API keys,
- credenciales de correo,
- credenciales de Vercel/Railway.

Sólo se permite subir:

```text
.env.example
```

con valores de ejemplo falsos.

---

## 12. Estructura recomendada

Mientras el proyecto crece, mantener separación por responsabilidad:

```text
components/        UI reutilizable
lib/               reglas, helpers, almacenamiento, seguridad
app/               páginas y rutas Next.js
types/             tipos compartidos
data/              catálogos locales temporales
docs/              documentación técnica y reglas
```

Cuando llegue backend real:

```text
lib/auth/          autenticación y sesiones
lib/permissions/   permisos por rol
lib/prisma/        cliente Prisma y acceso a BD
lib/audit/         auditoría
lib/validation/    esquemas de validación
```

---

## 13. Convenciones de nombres

Usar nombres en inglés para código y español para textos visibles al usuario cuando la app sea en español.

Ejemplos:

```ts
const quoteStatus = "sent";
const clientDisplayName = "Empresa Demo";
function createQuoteRevision() {}
```

Textos visibles:

```tsx
<button>Guardar cotización</button>
```

---

## 14. TODOs y deuda técnica

No dejar `TODO` sueltos sin contexto.

Formato permitido:

```ts
// TODO(Sprint 2.4): mover esta validación al backend cuando exista login real.
```

Evitar:

```ts
// TODO arreglar luego
```

---

## 15. Regla final

Si una línea de código puede afectar dinero, permisos, seguridad, datos del cliente o información sensible, debe poder responder estas preguntas:

1. ¿Quién puede ejecutar esta acción?
2. ¿Qué datos modifica?
3. ¿Debe quedar auditado?
4. ¿Puede exponerse al cliente?
5. ¿Qué pasa si alguien intenta abusar de esta acción?
6. ¿Qué pasa si falla?

Si no podemos responder eso, no debe pasar a producción.
