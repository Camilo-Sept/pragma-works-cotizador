from pathlib import Path

SELF = Path("scripts/apply-commercial-capture-v2.py")


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(text: str, label: str, old: str, new: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"No encontré bloque esperado: {label}")
    return text.replace(old, new, 1)


# types/quote.ts
types_path = "types/quote.ts"
types = read(types_path)
types = replace_once(
    types,
    "ServiceItem visibleToClient",
    "  source: \"catalog\" | \"manual\";\n  requiresApproval: boolean;\n};",
    "  source: \"catalog\" | \"manual\";\n  requiresApproval: boolean;\n  visibleToClient?: boolean;\n};",
)
types = replace_once(
    types,
    "QuoteItem visibleToClient",
    "  source: \"catalog\" | \"manual\";\n  requiresApproval: boolean;\n  notes?: string;\n};",
    "  source: \"catalog\" | \"manual\";\n  requiresApproval: boolean;\n  visibleToClient?: boolean;\n  notes?: string;\n};",
)
types = replace_once(
    types,
    "PricingRules planning fields",
    "  aiEfficiencyPercent?: number;\n  sourceDeliveryPercent: number;",
    "  aiEfficiencyPercent?: number;\n  deliveryMarginMultiplier?: number;\n  developerCount?: number;\n  hoursPerDeveloperDay?: number;\n  deliveryAvailabilityPercent?: number;\n  deliveryBacklogHours?: number;\n  sourceDeliveryPercent: number;",
)
write(types_path, types)


# data/pricingRules.ts
rules_path = "data/pricingRules.ts"
rules = read(rules_path)
rules = replace_once(
    rules,
    "default planning fields",
    "  aiEfficiencyPercent: 20,\n  sourceDeliveryPercent: 25,",
    "  aiEfficiencyPercent: 20,\n  deliveryMarginMultiplier: 2,\n  developerCount: 2,\n  hoursPerDeveloperDay: 5,\n  deliveryAvailabilityPercent: 70,\n  deliveryBacklogHours: 0,\n  sourceDeliveryPercent: 25,",
)
write(rules_path, rules)


# prisma/schema.prisma
schema_path = "prisma/schema.prisma"
schema = read(schema_path)
schema = replace_once(
    schema,
    "Service visibleToClient",
    "  requiresApproval    Boolean         @default(false) @map(\"requires_approval\")\n  createdByUserId",
    "  requiresApproval    Boolean         @default(false) @map(\"requires_approval\")\n  visibleToClient     Boolean         @default(true) @map(\"visible_to_client\")\n  createdByUserId",
)
schema = replace_once(
    schema,
    "PricingRuleSet admin editable fields",
    "  discountPercent       Decimal  @default(0) @map(\"discount_percent\") @db.Decimal(7, 2)\n  sourceDeliveryPercent",
    "  discountPercent       Decimal  @default(0) @map(\"discount_percent\") @db.Decimal(7, 2)\n  aiEfficiencyPercent   Decimal  @default(20) @map(\"ai_efficiency_percent\") @db.Decimal(7, 2)\n  deliveryMarginMultiplier Decimal @default(2) @map(\"delivery_margin_multiplier\") @db.Decimal(7, 2)\n  developerCount        Decimal  @default(2) @map(\"developer_count\") @db.Decimal(7, 2)\n  hoursPerDeveloperDay  Decimal  @default(5) @map(\"hours_per_developer_day\") @db.Decimal(7, 2)\n  deliveryAvailabilityPercent Decimal @default(70) @map(\"delivery_availability_percent\") @db.Decimal(7, 2)\n  deliveryBacklogHours  Decimal  @default(0) @map(\"delivery_backlog_hours\") @db.Decimal(10, 2)\n  sourceDeliveryPercent",
)
schema = replace_once(
    schema,
    "QuoteItem visibleToClient",
    "  requiresApproval Boolean         @default(false) @map(\"requires_approval\")\n  notes            String?",
    "  requiresApproval Boolean         @default(false) @map(\"requires_approval\")\n  visibleToClient  Boolean         @default(true) @map(\"visible_to_client\")\n  notes            String?",
)
write(schema_path, schema)


# app/api/services/route.ts
services_path = "app/api/services/route.ts"
services = read(services_path)
services = replace_once(
    services,
    "Service API visibleToClient",
    "      requiresApproval: service.requiresApproval,\n    }));",
    "      requiresApproval: service.requiresApproval,\n      visibleToClient: service.visibleToClient,\n    }));",
)
write(services_path, services)


# app/api/pricing-rules/default/route.ts full replacement
pricing_route_path = "app/api/pricing-rules/default/route.ts"
pricing_route = r'''import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/serverAuth";
import type { PricingRules } from "@/types/quote";

export const dynamic = "force-dynamic";

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rulesFromRuleSet(ruleSet: {
  riskPercent: unknown;
  urgencyPercent: unknown;
  commissionPercent: unknown;
  discountPercent: unknown;
  aiEfficiencyPercent: unknown;
  deliveryMarginMultiplier: unknown;
  developerCount: unknown;
  hoursPerDeveloperDay: unknown;
  deliveryAvailabilityPercent: unknown;
  deliveryBacklogHours: unknown;
  sourceDeliveryPercent: unknown;
  sourceBuyoutPercent: unknown;
  rentalInitialPercent: unknown;
  rentalMonthlyPercent: unknown;
  hybridInitialPercent: unknown;
  hybridMonthlyPercent: unknown;
  minimumOneTimePrice: unknown;
  minimumMonthlyPrice: unknown;
  websiteAnnualRenewal: unknown;
}): PricingRules {
  return {
    riskPercent: Number(ruleSet.riskPercent),
    urgencyPercent: Number(ruleSet.urgencyPercent),
    commissionPercent: Number(ruleSet.commissionPercent),
    discountPercent: Number(ruleSet.discountPercent),
    aiEfficiencyPercent: Number(ruleSet.aiEfficiencyPercent),
    deliveryMarginMultiplier: Number(ruleSet.deliveryMarginMultiplier),
    developerCount: Number(ruleSet.developerCount),
    hoursPerDeveloperDay: Number(ruleSet.hoursPerDeveloperDay),
    deliveryAvailabilityPercent: Number(ruleSet.deliveryAvailabilityPercent),
    deliveryBacklogHours: Number(ruleSet.deliveryBacklogHours),
    sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),
    sourceBuyoutPercent: Number(ruleSet.sourceBuyoutPercent),
    rentalInitialPercent: Number(ruleSet.rentalInitialPercent),
    rentalMonthlyPercent: Number(ruleSet.rentalMonthlyPercent),
    hybridInitialPercent: Number(ruleSet.hybridInitialPercent),
    hybridMonthlyPercent: Number(ruleSet.hybridMonthlyPercent),
    minimumOneTimePrice: Number(ruleSet.minimumOneTimePrice),
    minimumMonthlyPrice: Number(ruleSet.minimumMonthlyPrice),
    websiteAnnualRenewal: Number(ruleSet.websiteAnnualRenewal),
  };
}

export async function GET() {
  try {
    const auth = await requireAuth();

    if (!auth.ok) {
      return auth.response;
    }

    const ruleSet = await prisma.pricingRuleSet.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!ruleSet) {
      return NextResponse.json(
        { error: "No hay reglas de precio marcadas como default." },
        { status: 404 },
      );
    }

    return NextResponse.json({ rules: rulesFromRuleSet(ruleSet), ruleSetName: ruleSet.name });
  } catch (error) {
    console.error("Error loading pricing rules from database", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las reglas de precio desde la base de datos." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const payload = (await request.json().catch(() => null)) as Partial<PricingRules> | null;

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const existing = await prisma.pricingRuleSet.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      riskPercent: numeric(payload.riskPercent),
      urgencyPercent: numeric(payload.urgencyPercent),
      commissionPercent: numeric(payload.commissionPercent),
      discountPercent: numeric(payload.discountPercent),
      aiEfficiencyPercent: Math.max(0, Math.min(40, numeric(payload.aiEfficiencyPercent, 20))),
      deliveryMarginMultiplier: Math.max(1, numeric(payload.deliveryMarginMultiplier, 2)),
      developerCount: Math.max(1, numeric(payload.developerCount, 2)),
      hoursPerDeveloperDay: Math.max(1, numeric(payload.hoursPerDeveloperDay, 5)),
      deliveryAvailabilityPercent: Math.max(10, Math.min(100, numeric(payload.deliveryAvailabilityPercent, 70))),
      deliveryBacklogHours: Math.max(0, numeric(payload.deliveryBacklogHours, 0)),
      sourceDeliveryPercent: numeric(payload.sourceDeliveryPercent),
      sourceBuyoutPercent: numeric(payload.sourceBuyoutPercent),
      rentalInitialPercent: numeric(payload.rentalInitialPercent),
      rentalMonthlyPercent: numeric(payload.rentalMonthlyPercent),
      hybridInitialPercent: numeric(payload.hybridInitialPercent),
      hybridMonthlyPercent: numeric(payload.hybridMonthlyPercent),
      minimumOneTimePrice: numeric(payload.minimumOneTimePrice),
      minimumMonthlyPrice: numeric(payload.minimumMonthlyPrice),
      websiteAnnualRenewal: numeric(payload.websiteAnnualRenewal),
    };

    const ruleSet = existing
      ? await prisma.pricingRuleSet.update({ where: { id: existing.id }, data })
      : await prisma.pricingRuleSet.create({ data: { name: "Default", isDefault: true, ...data } });

    return NextResponse.json({ ok: true, rules: rulesFromRuleSet(ruleSet) });
  } catch (error) {
    console.error("Error saving pricing rules", error);
    return NextResponse.json({ ok: false, error: "No se pudieron guardar las reglas default." }, { status: 500 });
  }
}
'''
write(pricing_route_path, pricing_route)


# app/api/quotes/route.ts
quotes_path = "app/api/quotes/route.ts"
quotes = read(quotes_path)
quotes = replace_once(
    quotes,
    "rules snapshot planning fields",
    "    aiEfficiencyPercent: numberValue(\"aiEfficiencyPercent\"),\n    sourceDeliveryPercent: numberValue(\"sourceDeliveryPercent\"),",
    "    aiEfficiencyPercent: numberValue(\"aiEfficiencyPercent\"),\n    deliveryMarginMultiplier: numberValue(\"deliveryMarginMultiplier\"),\n    developerCount: numberValue(\"developerCount\"),\n    hoursPerDeveloperDay: numberValue(\"hoursPerDeveloperDay\"),\n    deliveryAvailabilityPercent: numberValue(\"deliveryAvailabilityPercent\"),\n    deliveryBacklogHours: numberValue(\"deliveryBacklogHours\"),\n    sourceDeliveryPercent: numberValue(\"sourceDeliveryPercent\"),",
)
quotes = replace_once(
    quotes,
    "map quote item visibleToClient",
    "    source: appServiceSourceMap[item.source],\n    requiresApproval: item.requiresApproval,\n    notes: item.notes ?? undefined,",
    "    source: appServiceSourceMap[item.source],\n    requiresApproval: item.requiresApproval,\n    visibleToClient: item.visibleToClient,\n    notes: item.notes ?? undefined,",
)
quotes = replace_once(
    quotes,
    "create quote item visibleToClient",
    "            source: serviceSourceMap[item.source] ?? ServiceSource.MANUAL,\n            requiresApproval: item.requiresApproval,\n            notes: item.notes?.trim() || null,",
    "            source: serviceSourceMap[item.source] ?? ServiceSource.MANUAL,\n            requiresApproval: item.requiresApproval,\n            visibleToClient: item.visibleToClient ?? true,\n            notes: item.notes?.trim() || null,",
)
write(quotes_path, quotes)


# components/CotizadorApp.tsx
app_path = "components/CotizadorApp.tsx"
app = read(app_path)
app = replace_once(
    app,
    "manual service visible default",
    "  estimatedHours: 1,\n  requiresApproval: true,\n});",
    "  estimatedHours: 1,\n  requiresApproval: true,\n  visibleToClient: true,\n});",
)
app = replace_once(
    app,
    "catalog service visible default",
    "  source: \"catalog\",\n  requiresApproval: false,\n});",
    "  source: \"catalog\",\n  requiresApproval: false,\n  visibleToClient: true,\n});",
)
app = replace_once(
    app,
    "defaultInternalCostDraft",
    "function makeId(prefix: string) {",
    "const defaultInternalCostDraft = (): Omit<ServiceItem, \"id\" | \"active\" | \"source\"> => ({\n  name: \"\",\n  category: \"infrastructure\",\n  descriptionClient: \"Costo interno no visible en propuesta comercial.\",\n  descriptionInternal: \"\",\n  billingType: \"one_time\",\n  basePrice: 0,\n  estimatedHours: 0,\n  requiresApproval: true,\n  visibleToClient: false,\n});\n\nfunction makeId(prefix: string) {",
)
app = replace_once(
    app,
    "serviceToQuoteItem visibleToClient",
    "    source: service.source,\n    requiresApproval: service.requiresApproval,\n    notes: service.descriptionInternal,",
    "    source: service.source,\n    requiresApproval: service.requiresApproval,\n    visibleToClient: service.visibleToClient ?? true,\n    notes: service.descriptionInternal,",
)
helper_old = '''function isPastDateInputValue(value?: string) {
  if (!value) return false;
  return value.slice(0, 10) < getTodayInputValue();
}
'''
helper_new = '''function isPastDateInputValue(value?: string) {
  if (!value) return false;
  return value.slice(0, 10) < getTodayInputValue();
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function addBusinessDays(start: Date, days: number) {
  const date = new Date(start);
  let remaining = Math.max(0, Math.ceil(days));

  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) remaining -= 1;
  }

  return toDateInputValue(date);
}

function countBusinessDaysBetween(fromValue: string, toValue: string) {
  const from = new Date(`${fromValue.slice(0, 10)}T00:00:00`);
  const to = new Date(`${toValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;

  const direction = to.getTime() >= from.getTime() ? 1 : -1;
  const cursor = new Date(from);
  let days = 0;

  while (cursor.toDateString() !== to.toDateString()) {
    cursor.setDate(cursor.getDate() + direction);
    if (isBusinessDay(cursor)) days += direction;
  }

  return days;
}

function getAutoUrgencyPercent(compressedBusinessDays: number) {
  if (compressedBusinessDays <= 0) return 0;
  if (compressedBusinessDays <= 2) return 10;
  if (compressedBusinessDays <= 5) return 15;
  if (compressedBusinessDays <= 9) return 25;
  return 35;
}

function calculateDeliveryPlan(estimatedHours: number, targetDeliveryDate: string | undefined, rules: PricingRules) {
  const marginMultiplier = Math.max(1, rules.deliveryMarginMultiplier ?? 2);
  const developerCount = Math.max(1, rules.developerCount ?? 2);
  const hoursPerDeveloperDay = Math.max(1, rules.hoursPerDeveloperDay ?? 5);
  const availabilityPercent = Math.max(10, Math.min(100, rules.deliveryAvailabilityPercent ?? 70));
  const backlogHours = Math.max(0, rules.deliveryBacklogHours ?? 0);
  const plannedHours = estimatedHours * marginMultiplier;
  const dailyCapacity = developerCount * hoursPerDeveloperDay * (availabilityPercent / 100);
  const requiredBusinessDays = plannedHours + backlogHours > 0 ? Math.max(1, Math.ceil((plannedHours + backlogHours) / dailyCapacity)) : 0;
  const suggestedDeliveryDate = addBusinessDays(getStartOfToday(), requiredBusinessDays);
  const businessDayDelta = targetDeliveryDate ? countBusinessDaysBetween(suggestedDeliveryDate, targetDeliveryDate) : null;
  const compressedBusinessDays = businessDayDelta !== null && businessDayDelta < 0 ? Math.abs(businessDayDelta) : 0;
  const autoUrgencyPercent = getAutoUrgencyPercent(compressedBusinessDays);

  return { marginMultiplier, developerCount, hoursPerDeveloperDay, availabilityPercent, backlogHours, plannedHours, dailyCapacity, requiredBusinessDays, suggestedDeliveryDate, businessDayDelta, compressedBusinessDays, autoUrgencyPercent };
}
'''
app = replace_once(app, "delivery helper functions", helper_old, helper_new)
app = replace_once(
    app,
    "internalCostDraft state",
    "  const [manualDraft, setManualDraft] = useState(defaultManualService());\n  const [saveManualToCatalog, setSaveManualToCatalog] = useState(true);",
    "  const [manualDraft, setManualDraft] = useState(defaultManualService());\n  const [internalCostDraft, setInternalCostDraft] = useState(defaultInternalCostDraft());\n  const [saveManualToCatalog, setSaveManualToCatalog] = useState(true);",
)
computed_old = '''  const totals = useMemo(
    () => calculateQuoteTotals(items, mode, sourceCodeOption, rules),
    [items, mode, sourceCodeOption, rules],
  );

  const whatsappSummary = useMemo(
    () => buildWhatsAppSummary({ client, items, mode, sourceCodeOption, totals }),
    [client, items, mode, sourceCodeOption, totals],
  );'''
computed_new = '''  const estimatedWorkHours = useMemo(
    () => items.reduce((sum, item) => sum + item.estimatedHours * item.quantity, 0),
    [items],
  );

  const deliveryPlan = useMemo(
    () => calculateDeliveryPlan(estimatedWorkHours, client.targetDeliveryDate, rules),
    [client.targetDeliveryDate, estimatedWorkHours, rules],
  );

  const effectiveRules = useMemo<PricingRules>(
    () => ({ ...rules, urgencyPercent: Math.max(rules.urgencyPercent, deliveryPlan.autoUrgencyPercent) }),
    [deliveryPlan.autoUrgencyPercent, rules],
  );

  const totals = useMemo(
    () => calculateQuoteTotals(items, mode, sourceCodeOption, effectiveRules),
    [items, mode, sourceCodeOption, effectiveRules],
  );

  const visibleQuoteItems = useMemo(() => items.filter((item) => item.visibleToClient !== false), [items]);
  const internalQuoteItems = useMemo(() => items.filter((item) => item.visibleToClient === false), [items]);
  const internalCostSubtotal = useMemo(() => internalQuoteItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [internalQuoteItems]);

  const whatsappSummary = useMemo(
    () => buildWhatsAppSummary({ client, items: visibleQuoteItems, mode, sourceCodeOption, totals }),
    [client, visibleQuoteItems, mode, sourceCodeOption, totals],
  );'''
app = replace_once(app, "computed totals delivery visibility", computed_old, computed_new)
add_internal_old = '''  function updateItem(id: string, patch: Partial<QuoteItem>) {'''
add_internal_new = '''  function addInternalCost() {
    if (!canEditCurrentQuote) {
      showSavedMessage(currentQuoteLocked ? "Cotización bloqueada. Crea una revisión para agregar costos internos." : "Tu rol no permite editar cotizaciones.");
      return;
    }

    if (!internalCostDraft.name.trim()) {
      showSavedMessage("El costo interno necesita nombre.");
      return;
    }

    if (internalCostDraft.basePrice <= 0) {
      showSavedMessage("El costo interno necesita importe mayor a cero.");
      return;
    }

    const item: QuoteItem = {
      id: makeId("internal-item"),
      name: internalCostDraft.name.trim(),
      category: internalCostDraft.category,
      billingType: internalCostDraft.billingType,
      unitPrice: Math.max(0, internalCostDraft.basePrice),
      quantity: 1,
      estimatedHours: Math.max(0, internalCostDraft.estimatedHours),
      source: "manual",
      requiresApproval: true,
      visibleToClient: false,
      notes: internalCostDraft.descriptionInternal?.trim() || "Costo interno agregado a la cotización.",
    };

    setItems((current) => [...current, item]);
    setInternalCostDraft(defaultInternalCostDraft());
    showSavedMessage("Costo interno agregado. Sí suma al precio, pero no se lista al cliente.");
  }

  function updateItem(id: string, patch: Partial<QuoteItem>) {'''
app = replace_once(app, "addInternalCost function", add_internal_old, add_internal_new)
app = replace_once(app, "buildSavedQuote effective rules", "      rules,\n      items,", "      rules: effectiveRules,\n      items,")
app = replace_once(app, "loadQuote default pricing merge", "    setRules(quote.rules);", "    setRules({ ...defaultPricingRules, ...quote.rules });")

model_old = '''              <div className="notice info" style={{ marginTop: 14 }}>
                Modalidad actual: <strong>{formatQuoteMode(mode)}</strong>. {mode === "rental" ? "En renta no se entrega código fuente." : "El código fuente puede cobrarse aparte si el cliente lo solicita."}
              </div>
            </section>'''
model_new = '''              <div className="notice info" style={{ marginTop: 14 }}>
                Modalidad actual: <strong>{formatQuoteMode(mode)}</strong>. {mode === "rental" ? "En renta no se entrega código fuente." : "El código fuente puede cobrarse aparte si el cliente lo solicita."}
                <br />
                {mode === "one_time" && "Venta única: el desarrollo se cobra como pago inicial; sólo habrá mensualidad si agregas servicios mensuales."}
                {mode === "rental" && " Renta mensual: pago inicial menor, mensualidad recurrente y sin entrega de código fuente."}
                {mode === "hybrid" && " Híbrido: parte se cobra al inicio y parte se recupera como mensualidad."}
              </div>
            </section>

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Reglas comerciales de esta cotización</h2>
                  <p>Captura descuentos y ajustes internos antes de enviar. La urgencia se calcula sola si la fecha solicitada se adelanta.</p>
                </div>
                {canEditPricingRules && (
                  <button
                    className="btn success"
                    type="button"
                    onClick={async () => {
                      const response = await fetch("/api/pricing-rules/default", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(rules),
                      });
                      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; rules?: PricingRules } | null;
                      if (!response.ok || !data?.ok) {
                        showSavedMessage(data?.error ?? "No se pudieron guardar las reglas default.");
                        return;
                      }
                      if (data.rules) setRules({ ...defaultPricingRules, ...data.rules });
                      showSavedMessage("Reglas default actualizadas para nuevas cotizaciones.");
                    }}
                  >
                    Guardar como default admin
                  </button>
                )}
              </div>
              <div className="form-grid">
                <div className="field"><label>Riesgo (%)</label><input disabled={!canEditCurrentQuote} type="number" min="0" value={rules.riskPercent} onChange={(event) => setRules({ ...rules, riskPercent: safeNumber(event.target.value) })} /></div>
                <div className="field"><label>Comisión (%)</label><input disabled={!canEditCurrentQuote} type="number" min="0" value={rules.commissionPercent} onChange={(event) => setRules({ ...rules, commissionPercent: safeNumber(event.target.value) })} /></div>
                <div className="field"><label>Descuento (%)</label><input disabled={!canEditCurrentQuote} type="number" min="0" value={rules.discountPercent} onChange={(event) => setRules({ ...rules, discountPercent: safeNumber(event.target.value) })} /></div>
                <div className="field"><label>Urgencia manual mínima (%)</label><input disabled={!canEditCurrentQuote} type="number" min="0" value={rules.urgencyPercent} onChange={(event) => setRules({ ...rules, urgencyPercent: safeNumber(event.target.value) })} /></div>
              </div>
              {rules.discountPercent > 10 && <div className="notice warning" style={{ marginTop: 14 }}>Descuento mayor a 10%. Este movimiento deberá solicitar autorización cuando conectemos el semáforo.</div>}
            </section>

            <section className="card">
              <div className="card-title"><div><h2>Planeación interna de entrega</h2><p>Fecha sugerida con margen x2, capacidad real del equipo y carga previa.</p></div></div>
              <div className="form-grid">
                <div className="field"><label>Margen de error</label><input disabled={!canEditCurrentQuote} type="number" min="1" step="0.5" value={rules.deliveryMarginMultiplier ?? 2} onChange={(event) => setRules({ ...rules, deliveryMarginMultiplier: Math.max(1, safeNumber(event.target.value, 2)) })} /></div>
                <div className="field"><label>Desarrolladores disponibles</label><input disabled={!canEditCurrentQuote} type="number" min="1" value={rules.developerCount ?? 2} onChange={(event) => setRules({ ...rules, developerCount: Math.max(1, safeNumber(event.target.value, 2)) })} /></div>
                <div className="field"><label>Horas reales/día/dev</label><input disabled={!canEditCurrentQuote} type="number" min="1" value={rules.hoursPerDeveloperDay ?? 5} onChange={(event) => setRules({ ...rules, hoursPerDeveloperDay: Math.max(1, safeNumber(event.target.value, 5)) })} /></div>
                <div className="field"><label>Disponibilidad real (%)</label><input disabled={!canEditCurrentQuote} type="number" min="10" max="100" value={rules.deliveryAvailabilityPercent ?? 70} onChange={(event) => setRules({ ...rules, deliveryAvailabilityPercent: Math.max(10, Math.min(100, safeNumber(event.target.value, 70))) })} /></div>
                <div className="field"><label>Horas en cola/proyectos activos</label><input disabled={!canEditCurrentQuote} type="number" min="0" value={rules.deliveryBacklogHours ?? 0} onChange={(event) => setRules({ ...rules, deliveryBacklogHours: Math.max(0, safeNumber(event.target.value)) })} /></div>
                <div className="field"><label>Fecha sugerida</label><input disabled value={deliveryPlan.suggestedDeliveryDate} /></div>
              </div>
              <div className="notice info" style={{ marginTop: 14 }}>
                Horas estimadas: <strong>{estimatedWorkHours} h</strong> · Horas planeadas: <strong>{deliveryPlan.plannedHours.toFixed(1)} h</strong> · Capacidad real: <strong>{deliveryPlan.dailyCapacity.toFixed(1)} h/día</strong> · Días hábiles requeridos: <strong>{deliveryPlan.requiredBusinessDays}</strong>.
                <br />
                Urgencia automática: <strong>{deliveryPlan.autoUrgencyPercent}%</strong>. Urgencia aplicada: <strong>{effectiveRules.urgencyPercent}%</strong>.
              </div>
              {deliveryPlan.compressedBusinessDays > 0 && <div className="notice warning" style={{ marginTop: 14 }}>La fecha solicitada adelanta {deliveryPlan.compressedBusinessDays} día(s) hábil(es) contra la fecha sugerida. Se aplica cargo de urgencia.</div>}
              <div style={{ marginTop: 14 }}><button className="btn ghost" type="button" disabled={!canEditCurrentQuote} onClick={() => setClient({ ...client, targetDeliveryDate: deliveryPlan.suggestedDeliveryDate })}>Usar fecha sugerida</button></div>
            </section>'''
app = replace_once(app, "commercial rules and delivery sections", model_old, model_new)

internal_panel = '''            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Costos internos / gastos ocultos</h2>
                  <p>Captura hosting, dominio, servidor, hostname, APIs, licencias o herramientas. Suman al precio, pero no se listan al cliente.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Concepto interno</label>
                  <input disabled={!canEditCurrentQuote} value={internalCostDraft.name} onChange={(event) => setInternalCostDraft({ ...internalCostDraft, name: event.target.value })} placeholder="Ej. Hosting, servidor, dominio, API, licencia" />
                </div>
                <div className="field">
                  <label>Categoría</label>
                  <select disabled={!canEditCurrentQuote} value={internalCostDraft.category} onChange={(event) => setInternalCostDraft({ ...internalCostDraft, category: event.target.value as ServiceCategory })}>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tipo de costo</label>
                  <select disabled={!canEditCurrentQuote} value={internalCostDraft.billingType} onChange={(event) => setInternalCostDraft({ ...internalCostDraft, billingType: event.target.value as BillingType })}>
                    <option value="one_time">Único</option>
                    <option value="monthly">Mensual</option>
                    <option value="annual">Anual</option>
                    <option value="hourly">Por hora</option>
                  </select>
                </div>
                <div className="field">
                  <label>Importe interno</label>
                  <input disabled={!canEditCurrentQuote} type="number" min="0" value={internalCostDraft.basePrice} onChange={(event) => setInternalCostDraft({ ...internalCostDraft, basePrice: safeNumber(event.target.value) })} />
                </div>
                <div className="field">
                  <label>Horas internas</label>
                  <input disabled={!canEditCurrentQuote} type="number" min="0" value={internalCostDraft.estimatedHours} onChange={(event) => setInternalCostDraft({ ...internalCostDraft, estimatedHours: safeNumber(event.target.value) })} />
                </div>
                <div className="field full">
                  <label>Nota interna</label>
                  <textarea disabled={!canEditCurrentQuote} value={internalCostDraft.descriptionInternal ?? ""} onChange={(event) => setInternalCostDraft({ ...internalCostDraft, descriptionInternal: event.target.value })} placeholder="Proveedor, razón del costo, renovación, observaciones..." />
                </div>
              </div>

              <div className="split-actions" style={{ marginTop: 14 }}>
                <button className="btn success" disabled={!canEditCurrentQuote || !internalCostDraft.name.trim() || internalCostDraft.basePrice <= 0} onClick={addInternalCost}>Agregar costo interno</button>
                <button className="btn ghost" disabled={!canEditCurrentQuote} onClick={() => setInternalCostDraft(defaultInternalCostDraft())}>Limpiar</button>
              </div>

              <div className="notice info" style={{ marginTop: 14 }}>
                Total interno oculto: <strong>{formatCurrency(internalCostSubtotal)}</strong>. Estos conceptos no aparecen en el PDF ni en WhatsApp, pero sí protegen margen.
              </div>

              {internalQuoteItems.length > 0 && (
                <div className="table-like" style={{ marginTop: 14 }}>
                  {internalQuoteItems.map((item) => (
                    <article className="quote-row" key={item.id}>
                      <div>
                        <h4>{item.name}</h4>
                        <p>{categoryLabels[item.category]} · {formatBillingType(item.billingType)} · Interno/no visible</p>
                      </div>
                      <div className="item-controls">
                        <div className="field">
                          <label>Cant.</label>
                          <input disabled={!canEditCurrentQuote} className="small-input" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(1, safeNumber(event.target.value, 1)) })} />
                        </div>
                        <div className="field">
                          <label>Importe</label>
                          <input disabled={!canEditCurrentQuote} className="small-input" type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: safeNumber(event.target.value) })} />
                        </div>
                        <div className="field">
                          <label>Horas</label>
                          <input disabled={!canEditCurrentQuote} className="small-input" type="number" min="0" value={item.estimatedHours} onChange={(event) => updateItem(item.id, { estimatedHours: safeNumber(event.target.value) })} />
                        </div>
                        <button className="btn ghost" disabled={!canEditCurrentQuote} onClick={() => updateItem(item.id, { visibleToClient: true })}>Pasar a cliente</button>
                        <button className="btn danger" disabled={!canEditCurrentQuote} onClick={() => removeItem(item.id)}>Quitar</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

'''
app = replace_once(
    app,
    "internal costs panel before visible items",
    "            <section className=\"card\">\n              <div className=\"card-title\">\n                <div>\n                  <h2>Conceptos agregados</h2>\n                  <p>Estos conceptos se usan para calcular el pago inicial, mensualidad y renovación.</p>",
    internal_panel + "            <section className=\"card\">\n              <div className=\"card-title\">\n                <div>\n                  <h2>Conceptos visibles al cliente</h2>\n                  <p>Estos conceptos sí aparecen en PDF / WhatsApp. Los gastos internos se administran en su propio panel.</p>",
)
app = replace_once(
    app,
    "visible items empty state",
    "              {items.length === 0 ? (\n                <div className=\"notice\">Todavía no hay conceptos agregados. Busca un servicio o crea uno nuevo desde el buscador.</div>",
    "              {visibleQuoteItems.length === 0 ? (\n                <div className=\"notice\">Todavía no hay conceptos visibles al cliente. Busca un servicio o crea uno nuevo desde el buscador.</div>",
)
app = replace_once(app, "visible items map", "                  {items.map((item) => (", "                  {visibleQuoteItems.map((item) => (")
app = replace_once(
    app,
    "visible item internal control",
    "                        <div className=\"field\">\n                          <label>Precio</label>\n                          <input disabled={!canEditCurrentQuote} className=\"small-input\" type=\"number\" min=\"0\" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: safeNumber(event.target.value) })} />\n                        </div>\n                        <button className=\"btn danger\" disabled={!canEditCurrentQuote} onClick={() => removeItem(item.id)}>Quitar</button>",
    "                        <div className=\"field\">\n                          <label>Precio</label>\n                          <input disabled={!canEditCurrentQuote} className=\"small-input\" type=\"number\" min=\"0\" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: safeNumber(event.target.value) })} />\n                        </div>\n                        <button className=\"btn ghost\" disabled={!canEditCurrentQuote} onClick={() => updateItem(item.id, { visibleToClient: false })}>Pasar a interno</button>\n                        <button className=\"btn danger\" disabled={!canEditCurrentQuote} onClick={() => removeItem(item.id)}>Quitar</button>",
)
app = replace_once(
    app,
    "summary internal cost row",
    "                <div className=\"service-row\">\n                  <div>\n                    <h4>Horas estimadas</h4>\n                    <p>Referencia interna para validar que no se esté regalando trabajo.</p>\n                  </div>\n                  <strong>{totals.estimatedHours} h</strong>\n                </div>",
    "                <div className=\"service-row\">\n                  <div>\n                    <h4>Horas estimadas</h4>\n                    <p>Referencia interna para validar que no se esté regalando trabajo.</p>\n                  </div>\n                  <strong>{totals.estimatedHours} h</strong>\n                </div>\n                <div className=\"service-row\">\n                  <div>\n                    <h4>Costos internos/no visibles</h4>\n                    <p>Infraestructura, hosting, servidor, APIs o licencias incluidas sin listarlas al cliente.</p>\n                  </div>\n                  <strong>{formatCurrency(internalCostSubtotal)}</strong>\n                </div>",
)
app = replace_once(
    app,
    "print visible length",
    "{items.length === 0 ? (\n                <p className=\"print-empty\">No hay conceptos agregados todavía.</p>",
    "{visibleQuoteItems.length === 0 ? (\n                <p className=\"print-empty\">No hay conceptos visibles para cliente todavía.</p>",
)
app = replace_once(app, "print visible map", "{items.map((item) => (", "{visibleQuoteItems.map((item) => (")
write(app_path, app)

SELF.unlink(missing_ok=True)
print("Sprint comercial 2.8.1 aplicado: reglas, planeación, costos internos y defaults admin.")
