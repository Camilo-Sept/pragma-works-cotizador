import fs from "node:fs";

const self = "scripts/apply-internal-costs-panel.mjs";

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

edit("components/CotizadorApp.tsx", (text) => {
  text = rep(text, "default internal cost draft", `const defaultCatalogService = (): ServiceItem => ({
  id: "",
  name: "",
  category: "other",
  descriptionClient: "",
  descriptionInternal: "",
  billingType: "one_time",
  basePrice: 0,
  estimatedHours: 1,
  active: true,
  source: "catalog",
  requiresApproval: false,
  visibleToClient: true,
});`, `const defaultCatalogService = (): ServiceItem => ({
  id: "",
  name: "",
  category: "other",
  descriptionClient: "",
  descriptionInternal: "",
  billingType: "one_time",
  basePrice: 0,
  estimatedHours: 1,
  active: true,
  source: "catalog",
  requiresApproval: false,
  visibleToClient: true,
});

const defaultInternalCostDraft = (): Omit<ServiceItem, "id" | "active" | "source"> => ({
  name: "",
  category: "infrastructure",
  descriptionClient: "Costo interno no visible en propuesta comercial.",
  descriptionInternal: "",
  billingType: "one_time",
  basePrice: 0,
  estimatedHours: 0,
  requiresApproval: true,
  visibleToClient: false,
});`);

  text = rep(text, "internal cost state", `  const [manualDraft, setManualDraft] = useState(defaultManualService());
  const [saveManualToCatalog, setSaveManualToCatalog] = useState(true);`, `  const [manualDraft, setManualDraft] = useState(defaultManualService());
  const [internalCostDraft, setInternalCostDraft] = useState(defaultInternalCostDraft());
  const [saveManualToCatalog, setSaveManualToCatalog] = useState(true);`);

  text = rep(text, "add internal cost function", `  function updateItem(id: string, patch: Partial<QuoteItem>) {`, `  function addInternalCost() {
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

  function updateItem(id: string, patch: Partial<QuoteItem>) {`);

  const panel = `

            <section className="card">
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
            </section>`;

  text = rep(text, "insert internal panel", `            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Conceptos agregados</h2>`, `${panel}

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Conceptos visibles al cliente</h2>`);

  text = rep(text, "visible concepts description", `                  <p>Estos conceptos se usan para calcular el pago inicial, mensualidad y renovación.</p>`, `                  <p>Estos conceptos sí aparecen en PDF / WhatsApp. Los gastos internos se administran en su propio panel.</p>`);
  text = rep(text, "visible concepts empty", `              {items.length === 0 ? (
                <div className="notice">Todavía no hay conceptos agregados. Busca un servicio o crea uno nuevo desde el buscador.</div>`, `              {visibleQuoteItems.length === 0 ? (
                <div className="notice">Todavía no hay conceptos visibles al cliente. Busca un servicio o crea uno nuevo desde el buscador.</div>`);
  text = rep(text, "visible concepts map", `                  {items.map((item) => (`, `                  {visibleQuoteItems.map((item) => (`);

  return text;
});

fs.rmSync(self, { force: true });
console.log("Panel separado de costos internos aplicado.");
