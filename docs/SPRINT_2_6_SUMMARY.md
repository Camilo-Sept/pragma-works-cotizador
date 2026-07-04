# Sprint 2.6 v2 - Guardar cotizaciones en BD

## Objetivo

Rehacer el guardado en PostgreSQL sin cambiar el comportamiento local del cotizador.

## Cambios

- Se agregó `app/api/quotes/route.ts` con `GET` y `POST`.
- Se agregó `lib/quoteDatabaseClient.ts` para sincronización desde el cliente.
- `components/CotizadorApp.tsx` conserva el guardado local y sólo dispara una sincronización asíncrona después de guardar.
- Las fechas de vigencia y entrega tienen selector de calendario y bloquean fechas pasadas.
- Se documentó el flujo en `docs/QUOTE_DATABASE_SAVE.md`.

## Garantías del flujo

- localStorage sigue guardando la cotización como antes.
- La sincronización con BD no bloquea el guardado local.
- Si BD falla, no se limpian cliente, proyecto, conceptos, folio ni estado actual.
- No se envolvió la UI en formularios ni se cambiaron botones a submit.
- No se tocaron `createManualConcept`, `addService`, `updateItem` ni `removeItem`.
- Los filtros de reportes siguen permitiendo fechas pasadas para revisar histórico.

## Validación manual sugerida

1. Abrir `http://127.0.0.1:3000`.
2. Llenar datos del cliente.
3. Agregar un concepto desde el buscador.
4. Llenar detalles del proyecto.
5. Guardar la cotización.
6. Confirmar que los campos siguen llenos y revisar `GET /api/quotes`.
