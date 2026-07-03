# Pragma Works Cotizador Pro - UI V1

Base inicial del cotizador comercial para servicios de software, automatización, soporte e IA.

Esta versión está hecha **a propósito sin Docker, Prisma, PostgreSQL, login ni backend**, para validar primero la pantalla, el flujo comercial y las reglas de cálculo antes de meter infraestructura.

## Stack

- Next.js
- React
- TypeScript
- CSS puro
- Catálogo local en archivos TypeScript
- localStorage para conceptos agregados manualmente

## Qué incluye esta V1

- Pantalla de nueva cotización.
- Datos de cliente/prospecto.
- Modalidad comercial:
  - Venta única.
  - Renta mensual.
  - Híbrido.
- Código fuente con recargo:
  - No incluido.
  - Entrega al liquidar.
  - Compra total.
- Catálogo local de servicios y módulos.
- Buscador inteligente de conceptos.
- Alta rápida de conceptos desde la cotización.
- Opción para guardar conceptos nuevos en catálogo local del navegador.
- Cálculo automático de:
  - pago inicial,
  - mensualidad,
  - renovación anual,
  - ajustes comerciales,
  - horas estimadas.
- Resumen listo para copiar a WhatsApp.
- Disclaimer de confidencialidad.
- Sección de reglas de precio editables en pantalla.
- Sección con comandos sugeridos para GitHub.

## Qué NO incluye todavía

- Base de datos.
- Prisma.
- Docker.
- Autenticación.
- Roles.
- PDF real.
- Guardado histórico de cotizaciones en servidor.
- Deploy.
- PWA instalable.

Eso se agrega después de validar que la UI y los cálculos estén correctos.

## Cómo correr localmente

Desde la carpeta del proyecto:

```bash
npm install
npm run dev
```

Luego abrir:

```text
http://localhost:3000
```

## Comandos útiles

```bash
npm run typecheck
npm run build
```

## Estructura principal

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  CotizadorApp.tsx
data/
  company.ts
  pricingRules.ts
  services.ts
lib/
  pricing.ts
types/
  quote.ts
```

## Preparar para GitHub

```bash
git init
git add .
git commit -m "feat: crear cotizador ui v1"
```

Crear el repo en GitHub y luego conectar:

```bash
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

## Reglas importantes del proyecto

- No subir `node_modules`.
- No subir `.next`.
- No subir `.env` cuando más adelante exista.
- No meter contraseñas ni secretos al repo.
- No agregar base de datos hasta que la cotización funcione correctamente en UI.
- Hacer commits pequeños por funcionalidad.

## Próximos sprints sugeridos

### Sprint 1.1

- Guardar cotizaciones en localStorage.
- Listar cotizaciones recientes.
- Duplicar cotización.
- Marcar cotización como borrador/enviada/aceptada/rechazada.

### Sprint 1.2

- Vista imprimible.
- Generación básica de PDF.
- Plantilla formal de cotización.

### Sprint 2

- Login.
- Roles.
- Base de datos.
- Catálogo administrable.

### Sprint 3

- Docker.
- PostgreSQL.
- Deploy.
- PWA instalable.
