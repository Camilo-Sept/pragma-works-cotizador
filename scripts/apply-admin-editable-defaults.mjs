import fs from "node:fs";

const self = "scripts/apply-admin-editable-defaults.mjs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, text) { fs.writeFileSync(path, text); }
function rep(text, label, from, to) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`No encontré bloque: ${label}`);
  return text.replace(from, to);
}

let schema = read("prisma/schema.prisma");
schema = rep(schema, "Service visibleToClient", "  requiresApproval    Boolean         @default(false) @map(\"requires_approval\")\n  createdByUserId", "  requiresApproval    Boolean         @default(false) @map(\"requires_approval\")\n  visibleToClient     Boolean         @default(true) @map(\"visible_to_client\")\n  createdByUserId");
schema = rep(schema, "PricingRuleSet editable defaults", "  discountPercent       Decimal  @default(0) @map(\"discount_percent\") @db.Decimal(7, 2)\n  sourceDeliveryPercent", "  discountPercent       Decimal  @default(0) @map(\"discount_percent\") @db.Decimal(7, 2)\n  aiEfficiencyPercent   Decimal  @default(20) @map(\"ai_efficiency_percent\") @db.Decimal(7, 2)\n  deliveryMarginMultiplier Decimal @default(2) @map(\"delivery_margin_multiplier\") @db.Decimal(7, 2)\n  developerCount        Decimal  @default(2) @map(\"developer_count\") @db.Decimal(7, 2)\n  hoursPerDeveloperDay  Decimal  @default(5) @map(\"hours_per_developer_day\") @db.Decimal(7, 2)\n  deliveryAvailabilityPercent Decimal @default(70) @map(\"delivery_availability_percent\") @db.Decimal(7, 2)\n  deliveryBacklogHours  Decimal  @default(0) @map(\"delivery_backlog_hours\") @db.Decimal(10, 2)\n  sourceDeliveryPercent");
write("prisma/schema.prisma", schema);

let servicesRoute = read("app/api/services/route.ts");
servicesRoute = rep(servicesRoute, "service visible map", "      requiresApproval: service.requiresApproval,\n    }));", "      requiresApproval: service.requiresApproval,\n      visibleToClient: service.visibleToClient,\n    }));");
write("app/api/services/route.ts", servicesRoute);

let pricingRoute = read("app/api/pricing-rules/default/route.ts");
pricingRoute = rep(pricingRoute, "requireRole import", "import { requireAuth } from \"@/lib/serverAuth\";", "import { requireAuth, requireRole } from \"@/lib/serverAuth\";");
pricingRoute = rep(pricingRoute, "GET editable defaults", `      aiEfficiencyPercent: 20,
      deliveryMarginMultiplier: 2,
      developerCount: 2,
      hoursPerDeveloperDay: 5,
      deliveryAvailabilityPercent: 70,
      deliveryBacklogHours: 0,
      sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),`, `      aiEfficiencyPercent: Number(ruleSet.aiEfficiencyPercent),
      deliveryMarginMultiplier: Number(ruleSet.deliveryMarginMultiplier),
      developerCount: Number(ruleSet.developerCount),
      hoursPerDeveloperDay: Number(ruleSet.hoursPerDeveloperDay),
      deliveryAvailabilityPercent: Number(ruleSet.deliveryAvailabilityPercent),
      deliveryBacklogHours: Number(ruleSet.deliveryBacklogHours),
      sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),`);
if (!pricingRoute.includes("export async function PATCH")) {
  pricingRoute += `

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
`;
}
write("app/api/pricing-rules/default/route.ts", pricingRoute);

let app = read("components/CotizadorApp.tsx");
app = rep(app, "admin defaults button", `<section className="card">
              <div className="card-title">
                <div>
                  <h2>Reglas comerciales de esta cotización</h2>
                  <p>Captura descuentos y ajustes internos antes de enviar. La urgencia se calcula sola si la fecha solicitada se adelanta.</p>
                </div>
              </div>`, `<section className="card">
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
              </div>`);
write("components/CotizadorApp.tsx", app);

fs.rmSync(self, { force: true });
console.log("Defaults comerciales editables por admin aplicados.");
