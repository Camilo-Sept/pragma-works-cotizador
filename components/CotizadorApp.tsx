"use client";

import { useEffect, useMemo, useState } from "react";
import { companyProfile } from "@/data/company";
import { defaultPricingRules } from "@/data/pricingRules";
import { initialServices } from "@/data/services";
import {
  buildWhatsAppSummary,
  calculateQuoteTotals,
  formatBillingType,
  formatCurrency,
  formatQuoteMode,
  formatSourceCodeOption,
} from "@/lib/pricing";
import type {
  BillingType,
  ClientDraft,
  PricingRules,
  QuoteItem,
  QuoteMode,
  ServiceCategory,
  ServiceItem,
  SourceCodeOption,
} from "@/types/quote";

const CUSTOM_SERVICES_KEY = "pragma-works-custom-services-v1";

const categoryLabels: Record<ServiceCategory, string> = {
  web: "Web",
  system: "Sistema",
  mobile: "App móvil",
  desktop: "Escritorio",
  automation: "Automatización",
  ai: "IA",
  support: "Soporte",
  infrastructure: "Infraestructura",
  other: "Otro",
};

const defaultClient: ClientDraft = {
  clientName: "",
  company: "",
  phone: "",
  email: "",
  projectName: "",
  notes: "",
};

const defaultManualService = (name = ""): Omit<ServiceItem, "id" | "active" | "source"> => ({
  name,
  category: "other",
  descriptionClient: "Concepto agregado manualmente durante la captura de la cotización.",
  descriptionInternal: "Pendiente de revisión interna.",
  billingType: "one_time",
  basePrice: 0,
  estimatedHours: 1,
  requiresApproval: true,
});

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function serviceToQuoteItem(service: ServiceItem): QuoteItem {
  return {
    id: makeId("item"),
    serviceId: service.source === "catalog" ? service.id : undefined,
    name: service.name,
    category: service.category,
    billingType: service.billingType,
    unitPrice: service.basePrice,
    quantity: 1,
    estimatedHours: service.estimatedHours,
    source: service.source,
    requiresApproval: service.requiresApproval,
    notes: service.descriptionInternal,
  };
}

function safeNumber(value: string | number, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CotizadorApp() {
  const [activeTab, setActiveTab] = useState<"quote" | "catalog" | "rules" | "github">("quote");
  const [client, setClient] = useState<ClientDraft>(defaultClient);
  const [mode, setMode] = useState<QuoteMode>("hybrid");
  const [sourceCodeOption, setSourceCodeOption] = useState<SourceCodeOption>("none");
  const [rules, setRules] = useState<PricingRules>(defaultPricingRules);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customServices, setCustomServices] = useState<ServiceItem[]>([]);
  const [manualDraft, setManualDraft] = useState(defaultManualService());
  const [saveManualToCatalog, setSaveManualToCatalog] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(CUSTOM_SERVICES_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ServiceItem[];
      setCustomServices(parsed);
    } catch {
      window.localStorage.removeItem(CUSTOM_SERVICES_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(customServices));
  }, [customServices]);

  const services = useMemo(
    () => [...initialServices, ...customServices].filter((service) => service.active),
    [customServices],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return services.slice(0, 8);

    return services
      .filter((service) => {
        const haystack = [
          service.name,
          service.descriptionClient,
          categoryLabels[service.category],
          service.billingType,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [normalizedQuery, services]);

  const exactServiceExists = services.some(
    (service) => service.name.trim().toLowerCase() === normalizedQuery,
  );

  const totals = useMemo(
    () => calculateQuoteTotals(items, mode, sourceCodeOption, rules),
    [items, mode, sourceCodeOption, rules],
  );

  const whatsappSummary = useMemo(
    () => buildWhatsAppSummary({ client, items, mode, sourceCodeOption, totals }),
    [client, items, mode, sourceCodeOption, totals],
  );

  function addService(service: ServiceItem) {
    setItems((current) => [...current, serviceToQuoteItem(service)]);
    setQuery("");
  }

  function createManualConcept() {
    if (!manualDraft.name.trim()) return;
    if (manualDraft.basePrice <= 0) return;

    const service: ServiceItem = {
      ...manualDraft,
      id: makeId("manual-service"),
      name: manualDraft.name.trim(),
      active: true,
      source: saveManualToCatalog ? "catalog" : "manual",
      requiresApproval: true,
    };

    if (saveManualToCatalog) {
      setCustomServices((current) => [...current, service]);
    }

    addService({ ...service, source: saveManualToCatalog ? "catalog" : "manual" });
    setManualDraft(defaultManualService());
    setSaveManualToCatalog(true);
  }

  function updateItem(id: string, patch: Partial<QuoteItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function copySummary() {
    await navigator.clipboard.writeText(whatsappSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function resetQuote() {
    setClient(defaultClient);
    setMode("hybrid");
    setSourceCodeOption("none");
    setItems([]);
    setQuery("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <section className="brand">
          <div className="brand-mark">PW</div>
          <div>
            <h1 className="brand-title">{companyProfile.name} Cotizador Pro</h1>
            <p className="brand-subtitle">
              {companyProfile.descriptor} · {companyProfile.slogan}
            </p>
          </div>
        </section>
        <div className="pill-row">
          <span className="pill">UI V1 sin BD</span>
          <span className="pill">Listo para GitHub</span>
          <span className="pill">Sin Docker / Prisma</span>
        </div>
      </header>

      <nav className="tabs" aria-label="Secciones del cotizador">
        <button className={`tab-button ${activeTab === "quote" ? "active" : ""}`} onClick={() => setActiveTab("quote")}>
          Nueva cotización
        </button>
        <button className={`tab-button ${activeTab === "catalog" ? "active" : ""}`} onClick={() => setActiveTab("catalog")}>
          Catálogo local
        </button>
        <button className={`tab-button ${activeTab === "rules" ? "active" : ""}`} onClick={() => setActiveTab("rules")}>
          Reglas de precio
        </button>
        <button className={`tab-button ${activeTab === "github" ? "active" : ""}`} onClick={() => setActiveTab("github")}>
          GitHub / siguiente sprint
        </button>
      </nav>

      {activeTab === "quote" && (
        <section className="grid two">
          <div className="grid">
            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Datos del cliente</h2>
                  <p>Información básica para preparar la propuesta comercial.</p>
                </div>
                <button className="btn ghost" onClick={resetQuote}>Limpiar</button>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Nombre del contacto</label>
                  <input value={client.clientName} onChange={(event) => setClient({ ...client, clientName: event.target.value })} placeholder="Ej. Dr. Hernández" />
                </div>
                <div className="field">
                  <label>Empresa / negocio</label>
                  <input value={client.company} onChange={(event) => setClient({ ...client, company: event.target.value })} placeholder="Ej. Clínica Dental Sonrisas" />
                </div>
                <div className="field">
                  <label>WhatsApp / teléfono</label>
                  <input value={client.phone} onChange={(event) => setClient({ ...client, phone: event.target.value })} placeholder="656 ..." />
                </div>
                <div className="field">
                  <label>Correo</label>
                  <input value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} placeholder="cliente@empresa.com" />
                </div>
                <div className="field full">
                  <label>Nombre del proyecto</label>
                  <input value={client.projectName} onChange={(event) => setClient({ ...client, projectName: event.target.value })} placeholder="Ej. Sistema de control de pacientes y visitas" />
                </div>
                <div className="field full">
                  <label>Notas del levantamiento</label>
                  <textarea value={client.notes} onChange={(event) => setClient({ ...client, notes: event.target.value })} placeholder="Qué pidió el cliente, riesgos, dudas, cosas pendientes..." />
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Modelo comercial</h2>
                  <p>Permite vender por pago único, renta mensual o modelo híbrido.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Modalidad</label>
                  <select value={mode} onChange={(event) => setMode(event.target.value as QuoteMode)}>
                    <option value="one_time">Venta única</option>
                    <option value="rental">Renta mensual</option>
                    <option value="hybrid">Híbrido</option>
                  </select>
                </div>
                <div className="field">
                  <label>Código fuente</label>
                  <select
                    value={mode === "rental" ? "none" : sourceCodeOption}
                    disabled={mode === "rental"}
                    onChange={(event) => setSourceCodeOption(event.target.value as SourceCodeOption)}
                  >
                    <option value="none">No incluir</option>
                    <option value="delivery_after_payment">Entrega al liquidar +{rules.sourceDeliveryPercent}%</option>
                    <option value="full_buyout">Compra total +{rules.sourceBuyoutPercent}%</option>
                  </select>
                </div>
              </div>

              <div className="notice info" style={{ marginTop: 14 }}>
                Modalidad actual: <strong>{formatQuoteMode(mode)}</strong>. {mode === "rental" ? "En renta no se entrega código fuente." : "El código fuente puede cobrarse aparte si el cliente lo solicita."}
              </div>
            </section>

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Agregar servicios o módulos</h2>
                  <p>Busca por nombre, categoría o descripción. Si no existe, créalo desde aquí.</p>
                </div>
              </div>

              <div className="search-area">
                <label>Buscar concepto</label>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setManualDraft((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="Ej. WhatsApp, pacientes, reportes, app móvil..."
                />

                <div className="suggestions">
                  {suggestions.map((service) => (
                    <article className="service-row" key={service.id}>
                      <div>
                        <h4>{service.name}</h4>
                        <p>{service.descriptionClient}</p>
                        <div className="meta-row">
                          <span className="meta">{categoryLabels[service.category]}</span>
                          <span className="meta">{formatBillingType(service.billingType)}</span>
                          <span className="meta">{formatCurrency(service.basePrice)}</span>
                          <span className="meta">{service.estimatedHours} h</span>
                        </div>
                      </div>
                      <button className="btn primary" onClick={() => addService(service)}>Agregar</button>
                    </article>
                  ))}
                </div>

                {normalizedQuery && !exactServiceExists && (
                  <div className="quick-create">
                    <div className="card-title">
                      <div>
                        <h3>+ Crear nuevo concepto: “{query.trim()}”</h3>
                        <p>Úsalo sólo para esta cotización o guárdalo en el catálogo local.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label>Nombre</label>
                        <input value={manualDraft.name} onChange={(event) => setManualDraft({ ...manualDraft, name: event.target.value })} />
                      </div>
                      <div className="field">
                        <label>Categoría</label>
                        <select value={manualDraft.category} onChange={(event) => setManualDraft({ ...manualDraft, category: event.target.value as ServiceCategory })}>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Tipo de cobro</label>
                        <select value={manualDraft.billingType} onChange={(event) => setManualDraft({ ...manualDraft, billingType: event.target.value as BillingType })}>
                          <option value="one_time">Único</option>
                          <option value="monthly">Mensual</option>
                          <option value="annual">Anual</option>
                          <option value="hourly">Por hora</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Precio</label>
                        <input type="number" min="0" value={manualDraft.basePrice} onChange={(event) => setManualDraft({ ...manualDraft, basePrice: safeNumber(event.target.value) })} />
                      </div>
                      <div className="field">
                        <label>Horas estimadas</label>
                        <input type="number" min="0" value={manualDraft.estimatedHours} onChange={(event) => setManualDraft({ ...manualDraft, estimatedHours: safeNumber(event.target.value, 1) })} />
                      </div>
                      <div className="field">
                        <label>Guardar en catálogo</label>
                        <select value={saveManualToCatalog ? "yes" : "no"} onChange={(event) => setSaveManualToCatalog(event.target.value === "yes")}>
                          <option value="yes">Sí, usar en futuras cotizaciones</option>
                          <option value="no">No, sólo esta cotización</option>
                        </select>
                      </div>
                      <div className="field full">
                        <label>Descripción para cliente</label>
                        <textarea value={manualDraft.descriptionClient} onChange={(event) => setManualDraft({ ...manualDraft, descriptionClient: event.target.value })} />
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <button className="btn success" disabled={!manualDraft.name.trim() || manualDraft.basePrice <= 0} onClick={createManualConcept}>
                        Guardar y agregar a cotización
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Conceptos agregados</h2>
                  <p>Estos conceptos se usan para calcular el pago inicial, mensualidad y renovación.</p>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="notice">Todavía no hay conceptos agregados. Busca un servicio o crea uno nuevo desde el buscador.</div>
              ) : (
                <div className="table-like">
                  {items.map((item) => (
                    <article className="quote-row" key={item.id}>
                      <div>
                        <h4>{item.name}</h4>
                        <p>
                          {categoryLabels[item.category]} · {formatBillingType(item.billingType)} · {item.source === "manual" ? "Manual" : "Catálogo"}
                          {item.requiresApproval ? " · Revisión interna" : ""}
                        </p>
                      </div>
                      <div className="item-controls">
                        <div className="field">
                          <label>Cant.</label>
                          <input className="small-input" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(1, safeNumber(event.target.value, 1)) })} />
                        </div>
                        <div className="field">
                          <label>Precio</label>
                          <input className="small-input" type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: safeNumber(event.target.value) })} />
                        </div>
                        <button className="btn danger" onClick={() => removeItem(item.id)}>Quitar</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="summary-panel grid">
            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Resumen calculado</h2>
                  <p>Precio sugerido con reglas comerciales configurables.</p>
                </div>
              </div>

              <div className="total-card">
                <div className="total-box highlight">
                  <span>Pago inicial</span>
                  <strong>{formatCurrency(totals.suggestedInitialPayment)}</strong>
                </div>
                <div className="total-box">
                  <span>Mensualidad</span>
                  <strong>{formatCurrency(totals.suggestedMonthlyPayment)}</strong>
                </div>
                <div className="total-box">
                  <span>Renovación anual</span>
                  <strong>{formatCurrency(totals.suggestedAnnualRenewal)}</strong>
                </div>
              </div>

              <div className="grid">
                <div className="service-row">
                  <div>
                    <h4>Subtotal único</h4>
                    <p>Servicios de pago único antes de ajustes.</p>
                  </div>
                  <strong>{formatCurrency(totals.oneTimeSubtotal)}</strong>
                </div>
                <div className="service-row">
                  <div>
                    <h4>Ajustes comerciales</h4>
                    <p>Riesgo, urgencia, comisión, descuento y código fuente.</p>
                  </div>
                  <strong>{formatCurrency(totals.riskCharge + totals.urgencyCharge + totals.commissionCharge - totals.discountAmount + totals.sourceCodeCharge)}</strong>
                </div>
                <div className="service-row">
                  <div>
                    <h4>Horas estimadas</h4>
                    <p>Referencia interna para validar que no se esté regalando trabajo.</p>
                  </div>
                  <strong>{totals.estimatedHours} h</strong>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Resumen para WhatsApp</h2>
                  <p>Texto rápido para enviar o usar como base comercial.</p>
                </div>
                <button className="btn success" onClick={copySummary}>{copied ? "Copiado" : "Copiar"}</button>
              </div>
              <pre className="preview">{whatsappSummary}</pre>
            </section>
          </aside>
        </section>
      )}

      {activeTab === "catalog" && (
        <section className="grid">
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Catálogo local de servicios</h2>
                <p>V1 usa catálogo en archivo + conceptos personalizados guardados en este navegador.</p>
              </div>
            </div>
            <div className="catalog-list">
              {services.map((service) => (
                <article className="service-row" key={service.id}>
                  <div>
                    <h4>{service.name}</h4>
                    <p>{service.descriptionClient}</p>
                    <div className="meta-row">
                      <span className="meta">{categoryLabels[service.category]}</span>
                      <span className="meta">{formatBillingType(service.billingType)}</span>
                      <span className="meta">{formatCurrency(service.basePrice)}</span>
                      <span className="meta">{service.source === "catalog" ? "Catálogo" : "Manual"}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {activeTab === "rules" && (
        <section className="grid two">
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Reglas de precio</h2>
                <p>Estos porcentajes son locales en la V1. Más adelante irán en base de datos.</p>
              </div>
            </div>
            <div className="form-grid">
              {(
                [
                  ["riskPercent", "Riesgo técnico %"],
                  ["urgencyPercent", "Urgencia %"],
                  ["commissionPercent", "Comisión vendedor %"],
                  ["discountPercent", "Descuento %"],
                  ["sourceDeliveryPercent", "Código fuente al liquidar %"],
                  ["sourceBuyoutPercent", "Compra total código %"],
                  ["rentalInitialPercent", "Renta: pago inicial %"],
                  ["rentalMonthlyPercent", "Renta: mensual del desarrollo %"],
                  ["hybridInitialPercent", "Híbrido: pago inicial %"],
                  ["hybridMonthlyPercent", "Híbrido: mensual del desarrollo %"],
                  ["minimumOneTimePrice", "Mínimo pago único $"],
                  ["minimumMonthlyPrice", "Mínimo mensual $"],
                  ["websiteAnnualRenewal", "Renovación anual web $"],
                ] as const
              ).map(([key, label]) => (
                <div className="field" key={key}>
                  <label>{label}</label>
                  <input
                    type="number"
                    value={rules[key]}
                    onChange={(event) => setRules({ ...rules, [key]: safeNumber(event.target.value) })}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-title">
              <div>
                <h2>Condiciones comerciales base</h2>
                <p>Recordatorio para no prometer cosas fuera de alcance.</p>
              </div>
            </div>
            <div className="grid">
              <div className="notice info">
                Página web fija desde {formatCurrency(10000)}. Incluye 1 año de servicio básico y 3 mantenimientos simples. No incluye rediseño, base de datos, login, tienda, campañas, APIs o cambios mayores.
              </div>
              <div className="notice">
                Los precios no incluyen IVA salvo que se indique lo contrario. Hosting, dominio, correos, WhatsApp Business, IA, licencias o servicios externos pueden generar costos adicionales.
              </div>
              <div className="notice">
                La cotización y sus precios son confidenciales. No deben compartirse con terceros, proveedores, competidores o personas ajenas al proyecto.
              </div>
            </div>
          </section>
        </section>
      )}

      {activeTab === "github" && (
        <section className="grid two">
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Proyecto listo para GitHub</h2>
                <p>Esta base ya está pensada para subir limpia como primer commit.</p>
              </div>
            </div>
            <pre className="preview">{`git init
git add .
git commit -m "feat: crear cotizador ui v1"

# Luego crear repo en GitHub y conectar:
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main`}</pre>
          </section>
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Siguiente sprint</h2>
                <p>No meter base de datos hasta validar bien pantalla y cálculo.</p>
              </div>
            </div>
            <div className="grid">
              <div className="service-row"><div><h4>Sprint 1.1</h4><p>Guardar borradores en localStorage y listar cotizaciones recientes.</p></div></div>
              <div className="service-row"><div><h4>Sprint 1.2</h4><p>Generar vista imprimible / PDF sin base de datos.</p></div></div>
              <div className="service-row"><div><h4>Sprint 2</h4><p>Agregar login, base de datos y catálogo administrable.</p></div></div>
              <div className="service-row"><div><h4>Sprint 3</h4><p>Docker, PostgreSQL, deploy y PWA instalable.</p></div></div>
            </div>
          </section>
        </section>
      )}

      <p className="footer-note">
        {companyProfile.name} · UI V1 · Sin datos sensibles · Base inicial para GitHub.
      </p>
    </main>
  );
}
