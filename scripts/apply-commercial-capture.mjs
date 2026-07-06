import fs from "node:fs";

const self = "scripts/apply-commercial-capture.mjs";

function edit(path, fn) {
  const before = fs.readFileSync(path, "utf8");
  const after = fn(before);
  if (after !== before) fs.writeFileSync(path, after);
}
function rep(text, label, from, to) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`No encontré bloque: ${label}`);
  return text.replace(from, to);
}

edit("types/quote.ts", (text) => {
  text = rep(text, "ServiceItem visibleToClient", "  requiresApproval: boolean;\n};", "  requiresApproval: boolean;\n  visibleToClient?: boolean;\n};");
  text = rep(text, "QuoteItem visibleToClient", "  requiresApproval: boolean;\n  notes?: string;", "  requiresApproval: boolean;\n  visibleToClient?: boolean;\n  notes?: string;");
  text = rep(text, "Planning rules", "  aiEfficiencyPercent?: number;\n  sourceDeliveryPercent: number;", "  aiEfficiencyPercent?: number;\n  deliveryMarginMultiplier?: number;\n  developerCount?: number;\n  hoursPerDeveloperDay?: number;\n  deliveryAvailabilityPercent?: number;\n  deliveryBacklogHours?: number;\n  sourceDeliveryPercent: number;");
  return text;
});

edit("data/pricingRules.ts", (text) => rep(text, "planning defaults", "  aiEfficiencyPercent: 20,\n  sourceDeliveryPercent: 25,", "  aiEfficiencyPercent: 20,\n  deliveryMarginMultiplier: 2,\n  developerCount: 2,\n  hoursPerDeveloperDay: 5,\n  deliveryAvailabilityPercent: 70,\n  deliveryBacklogHours: 0,\n  sourceDeliveryPercent: 25,"));

edit("prisma/schema.prisma", (text) => rep(text, "visible client schema", "  requiresApproval Boolean         @default(false) @map(\"requires_approval\")\n  notes            String?", "  requiresApproval Boolean         @default(false) @map(\"requires_approval\")\n  visibleToClient  Boolean         @default(true) @map(\"visible_to_client\")\n  notes            String?"));

edit("app/api/pricing-rules/default/route.ts", (text) => rep(text, "planning api defaults", "      aiEfficiencyPercent: 20,\n      sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),", "      aiEfficiencyPercent: 20,\n      deliveryMarginMultiplier: 2,\n      developerCount: 2,\n      hoursPerDeveloperDay: 5,\n      deliveryAvailabilityPercent: 70,\n      deliveryBacklogHours: 0,\n      sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),"));

edit("app/api/quotes/route.ts", (text) => {
  text = rep(text, "map item visible", "    requiresApproval: item.requiresApproval,\n    notes: item.notes ?? undefined,", "    requiresApproval: item.requiresApproval,\n    visibleToClient: item.visibleToClient,\n    notes: item.notes ?? undefined,");
  text = rep(text, "rules snapshot planning", "    aiEfficiencyPercent: numberValue(\"aiEfficiencyPercent\"),\n    sourceDeliveryPercent: numberValue(\"sourceDeliveryPercent\"),", "    aiEfficiencyPercent: numberValue(\"aiEfficiencyPercent\"),\n    deliveryMarginMultiplier: numberValue(\"deliveryMarginMultiplier\"),\n    developerCount: numberValue(\"developerCount\"),\n    hoursPerDeveloperDay: numberValue(\"hoursPerDeveloperDay\"),\n    deliveryAvailabilityPercent: numberValue(\"deliveryAvailabilityPercent\"),\n    deliveryBacklogHours: numberValue(\"deliveryBacklogHours\"),\n    sourceDeliveryPercent: numberValue(\"sourceDeliveryPercent\"),");
  text = rep(text, "create item visible", "            requiresApproval: item.requiresApproval,\n            notes: item.notes?.trim() || null,", "            requiresApproval: item.requiresApproval,\n            visibleToClient: item.visibleToClient ?? true,\n            notes: item.notes?.trim() || null,");
  return text;
});

edit("components/CotizadorApp.tsx", (text) => {
  text = rep(text, "manual visible default", "  estimatedHours: 1,\n  requiresApproval: true,", "  estimatedHours: 1,\n  requiresApproval: true,\n  visibleToClient: true,");
  text = rep(text, "catalog visible default", "  requiresApproval: false,\n});", "  requiresApproval: false,\n  visibleToClient: true,\n});");
  text = rep(text, "service item visible", "    requiresApproval: service.requiresApproval,\n    notes: service.descriptionInternal,", "    requiresApproval: service.requiresApproval,\n    visibleToClient: service.visibleToClient ?? true,\n    notes: service.descriptionInternal,");

  text = rep(text, "delivery helpers", "function isPastDateInputValue(value?: string) {\n  if (!value) return false;\n  return value.slice(0, 10) < getTodayInputValue();\n}\n", `function isPastDateInputValue(value?: string) {
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
`);

  text = rep(text, "computed totals block", `  const totals = useMemo(
    () => calculateQuoteTotals(items, mode, sourceCodeOption, rules),
    [items, mode, sourceCodeOption, rules],
  );

  const whatsappSummary = useMemo(
    () => buildWhatsAppSummary({ client, items, mode, sourceCodeOption, totals }),
    [client, items, mode, sourceCodeOption, totals],
  );`, `  const estimatedWorkHours = useMemo(
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
  );`);

  text = rep(text, "build quote effective rules", "      rules,\n      items,", "      rules: effectiveRules,\n      items,");
  text = rep(text, "load quote default rules", "    setRules(quote.rules);", "    setRules({ ...defaultPricingRules, ...quote.rules });");

  text = rep(text, "manual visible field", `                      <div className="field">
                        <label>Guardar en catálogo</label>
                        <select disabled={!canEditCurrentQuote} value={saveManualToCatalog ? "yes" : "no"} onChange={(event) => setSaveManualToCatalog(event.target.value === "yes")}>
                          <option value="yes">Sí, usar en futuras cotizaciones</option>
                          <option value="no">No, sólo esta cotización</option>
                        </select>
                      </div>`, `                      <div className="field">
                        <label>Guardar en catálogo</label>
                        <select disabled={!canEditCurrentQuote} value={saveManualToCatalog ? "yes" : "no"} onChange={(event) => setSaveManualToCatalog(event.target.value === "yes")}>
                          <option value="yes">Sí, usar en futuras cotizaciones</option>
                          <option value="no">No, sólo esta cotización</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Visible al cliente</label>
                        <select disabled={!canEditCurrentQuote} value={manualDraft.visibleToClient === false ? "no" : "yes"} onChange={(event) => setManualDraft({ ...manualDraft, visibleToClient: event.target.value === "yes" })}>
                          <option value="yes">Sí, aparece en propuesta</option>
                          <option value="no">No, costo interno</option>
                        </select>
                      </div>`);

  text = rep(text, "item visible meta", `                          {categoryLabels[item.category]} · {formatBillingType(item.billingType)} · {item.source === "manual" ? "Manual" : "Catálogo"}
                          {item.requiresApproval ? " · Revisión interna" : ""}`, `                          {categoryLabels[item.category]} · {formatBillingType(item.billingType)} · {item.source === "manual" ? "Manual" : "Catálogo"}
                          {item.visibleToClient === false ? " · Interno/no visible" : ""}
                          {item.requiresApproval ? " · Revisión interna" : ""}`);

  text = rep(text, "item visible control", `                        <div className="field">
                          <label>Precio</label>
                          <input disabled={!canEditCurrentQuote} className="small-input" type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: safeNumber(event.target.value) })} />
                        </div>`, `                        <div className="field">
                          <label>Precio</label>
                          <input disabled={!canEditCurrentQuote} className="small-input" type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: safeNumber(event.target.value) })} />
                        </div>
                        <div className="field">
                          <label>Visible</label>
                          <select disabled={!canEditCurrentQuote} value={item.visibleToClient === false ? "no" : "yes"} onChange={(event) => updateItem(item.id, { visibleToClient: event.target.value === "yes" })}>
                            <option value="yes">Cliente</option>
                            <option value="no">Interno</option>
                          </select>
                        </div>`);

  text = rep(text, "commercial planning section", `              <div className="notice info" style={{ marginTop: 14 }}>
                Modalidad actual: <strong>{formatQuoteMode(mode)}</strong>. {mode === "rental" ? "En renta no se entrega código fuente." : "El código fuente puede cobrarse aparte si el cliente lo solicita."}
              </div>
            </section>`, `              <div className="notice info" style={{ marginTop: 14 }}>
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
            </section>`);

  text = rep(text, "summary internal cost", `                <div className="service-row">
                  <div>
                    <h4>Horas estimadas</h4>
                    <p>Referencia interna para validar que no se esté regalando trabajo.</p>
                  </div>
                  <strong>{totals.estimatedHours} h</strong>
                </div>`, `                <div className="service-row">
                  <div>
                    <h4>Horas estimadas</h4>
                    <p>Referencia interna para validar que no se esté regalando trabajo.</p>
                  </div>
                  <strong>{totals.estimatedHours} h</strong>
                </div>
                <div className="service-row">
                  <div>
                    <h4>Costos internos/no visibles</h4>
                    <p>Infraestructura, hosting, servidor, hostname, APIs o licencias incluidas sin listarlas al cliente.</p>
                  </div>
                  <strong>{formatCurrency(internalCostSubtotal)}</strong>
                </div>`);

  text = rep(text, "print visible empty", "{items.length === 0 ? (\n                <p className=\"print-empty\">No hay conceptos agregados todavía.</p>", "{visibleQuoteItems.length === 0 ? (\n                <p className=\"print-empty\">No hay conceptos visibles para cliente todavía.</p>");
  text = rep(text, "print visible map", "{items.map((item) => (", "{visibleQuoteItems.map((item) => (");

  return text;
});

fs.rmSync(self, { force: true });
console.log("Captura comercial, planeación de entrega y costos internos aplicada.");
