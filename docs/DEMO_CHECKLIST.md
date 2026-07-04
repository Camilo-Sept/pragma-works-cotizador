# Checklist de demo

## Antes de presentar

- Confirmar que la app abre.
- Confirmar que `/api/health` responde `ok: true`.
- Confirmar chips `Catálogo: BD` y `Reglas: BD`.
- Tener una cotización de prueba guardada.
- Tener abierta la pestaña de `Historial`.
- Tener abierta la pestaña de `Vista / PDF`.

## Flujo recomendado

1. Mostrar pantalla principal.
2. Explicar que el catálogo y reglas pueden venir de BD, con fallback local.
3. Llenar datos del cliente.
4. Agregar un concepto desde buscador.
5. Elegir vigencia y fecha objetivo desde calendario.
6. Guardar borrador.
7. Mostrar que no se borran los campos.
8. Abrir historial.
9. Abrir vista / PDF.
10. Mostrar reportes.
11. Abrir `/api/health`.
12. Abrir `/api/quotes` para mostrar que la cotización llegó a PostgreSQL.

## Frase corta para explicar arquitectura

La app corre en Next.js. La interfaz guarda localmente para no perder trabajo y luego sincroniza una copia a PostgreSQL mediante API routes. Si la base de datos falla, la operación local no se rompe.

## Si Railway o Vercel fallan durante la demo

- La app sigue operando con fallback local para catálogo y reglas.
- El guardado local sigue funcionando en el navegador.
- Mostrar el mensaje de sincronización fallida como comportamiento esperado de resiliencia.
- Volver a probar `/api/health` cuando la conexión se restablezca.

## Cosas que todavía no son parte de esta demo

- Login real.
- Usuarios reales con contraseñas.
- Pagos.
- Envío automático de PDF por correo.
- Edición colaborativa multiusuario en tiempo real.
