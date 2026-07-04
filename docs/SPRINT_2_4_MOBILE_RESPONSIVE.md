# Sprint 2.4 - Responsive móvil y cotización rápida

## Objetivo

Mejorar la experiencia móvil del cotizador sin rehacer la aplicación ni crear una app nativa todavía.

La aplicación conserva la vista completa de escritorio para administración, reportes, catálogo y reglas, pero en celular debe sentirse más cómoda para capturar datos, agregar conceptos y revisar totales.

## Problema detectado

La UI actual funciona bien en escritorio, pero en celular se siente pesada porque contiene:

- formularios grandes,
- muchas pestañas,
- tarjetas y tablas largas,
- acciones pequeñas,
- navegación horizontal poco cómoda,
- totales lejos del flujo de captura.

## Cambios incluidos

- Navegación inferior fija en celular.
- Botones y campos más grandes para touch.
- Formularios a una columna.
- Cards más compactas.
- Tablas/reportes convertidos a bloques verticales en pantallas chicas.
- Barra móvil fija con total inicial, mensualidad y botón rápido a Vista / PDF.
- Espaciado inferior para que la navegación móvil no tape contenido.
- Ajustes para evitar zoom incómodo en inputs móviles.
- Mejora de lectura en cards de servicios, conceptos, historial y reportes.

## Alcance

Este sprint es visual/UX.

No cambia reglas de negocio, base de datos, Prisma, seed, login ni APIs.

## Pruebas recomendadas

```bash
nvm use
npm run typecheck
npm run build
npm run dev
```

Validar manualmente:

- escritorio sigue funcionando,
- celular muestra navegación inferior,
- botones son fáciles de tocar,
- formularios no se desbordan,
- barra móvil no tapa la captura,
- Vista / PDF sigue funcionando,
- impresión/PDF no incluye la barra móvil.

## Notas

Esto no sustituye una app móvil nativa. La intención es que la web sea usable desde celular mientras el sistema sigue creciendo.

Una app nativa o PWA instalable puede evaluarse después de conectar login, base de datos y flujo real de cotizaciones.
