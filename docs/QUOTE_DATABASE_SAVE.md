# Guardado de cotizaciones en PostgreSQL

Sprint 2.6 v2 mantiene localStorage como fuente inmediata del flujo de UI y agrega una sincronización posterior a PostgreSQL.

## Flujo

1. `components/CotizadorApp.tsx` construye la `SavedQuote`.
2. La cotización se guarda localmente con `persistQuotes(nextQuotes)`.
3. Se conserva `currentQuoteId` y `quoteStatus`.
4. `syncQuoteToDatabase(quote)` envía una copia a `POST /api/quotes`.

Si la API o la base de datos fallan, el guardado local no se revierte y el formulario no se limpia.

Las fechas propias de la cotización no aceptan valores pasados:

- `validUntil`
- `client.targetDeliveryDate`

Los filtros de reportes sí pueden usar fechas pasadas para consultar histórico.

## Endpoint

- `POST /api/quotes`: valida datos mínimos, crea o actualiza cliente, crea o actualiza cotización, reemplaza conceptos y registra auditoría básica.
- `GET /api/quotes`: lista las últimas cotizaciones con cliente y conceptos para validación manual.

El endpoint usa Prisma y una transacción para mantener consistente la cotización y sus conceptos.

## Notas de schema

- `projectName` no tiene columna propia en `Quote`; se guarda como nota interna congelada.
- Los conceptos manuales o servicios locales sin registro en BD se guardan con `serviceId: null` para evitar romper la llave foránea.
- Los totales y reglas se guardan como snapshot de la cotización local.
