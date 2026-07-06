# Checklist de demo

## Antes de presentar

- Confirmar que la app abre.
- Confirmar que `/api/health` responde `ok: true`.
- Confirmar que el login no muestra credenciales visibles.
- Confirmar que se puede iniciar sesión con un usuario válido.
- Confirmar chips `Catálogo: BD` y `Reglas: BD` después de iniciar sesión.
- Tener una cotización de prueba guardada.
- Tener abierta la pestaña de `Historial`.
- Tener abierta la pestaña de `Vista / PDF`.

## Checklist de seguridad rápida

- Abrir la app en incógnito y confirmar que pide login.
- Probar `/api/quotes` sin sesión y confirmar que responde error de sesión.
- Probar `/api/services` sin sesión y confirmar que responde error de sesión.
- Probar `/api/pricing-rules/default` sin sesión y confirmar que responde error de sesión.
- Iniciar sesión con usuario `ventas` y confirmar que no puede guardar cotizaciones como aceptadas o rechazadas.
- Iniciar sesión con usuario `admin` o `supervisor` y confirmar que sí puede guardar cotizaciones aceptadas o rechazadas.
- Confirmar que el seed de producción no crea usuarios demo fijos.

## Flujo recomendado

1. Mostrar pantalla de login.
2. Iniciar sesión con usuario autorizado.
3. Mostrar pantalla principal.
4. Explicar que el catálogo y reglas pueden venir de BD, con fallback local.
5. Llenar datos del cliente.
6. Agregar un concepto desde buscador.
7. Elegir vigencia y fecha objetivo desde calendario.
8. Guardar borrador.
9. Mostrar que no se borran los campos.
10. Abrir historial.
11. Abrir vista / PDF.
12. Mostrar reportes.
13. Abrir `/api/health`.
14. Abrir `/api/quotes` con sesión activa para mostrar que la cotización llegó a PostgreSQL.

## Frase corta para explicar arquitectura

La app corre en Next.js. La interfaz guarda localmente para no perder trabajo y luego sincroniza una copia a PostgreSQL mediante API routes protegidas con sesión. Si la base de datos falla, la operación local no se rompe.

## Si Railway o Vercel fallan durante la demo

- La app sigue operando con fallback local para catálogo y reglas.
- El guardado local sigue funcionando en el navegador.
- Mostrar el mensaje de sincronización fallida como comportamiento esperado de resiliencia.
- Volver a probar `/api/health` cuando la conexión se restablezca.

## Cosas que todavía no son parte de esta demo

- Panel administrativo de usuarios.
- Recuperación de contraseña.
- Rate limit persistente avanzado.
- Pagos.
- Envío automático de PDF por correo.
- Edición colaborativa multiusuario en tiempo real.
- PDF dedicado con librería.
