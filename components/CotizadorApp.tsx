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
import {
  getDefaultValidUntil,
  getNextQuoteFolio,
  loadSavedQuotes,
  persistSavedQuotes,
  sortQuotesByUpdatedAt,
} from "@/lib/quoteStorage";
import type {
  BillingType,
  ClientDraft,
  PricingRules,
  QuoteItem,
  QuoteMode,
  QuoteStatus,
  SavedQuote,
  ServiceCategory,
  ServiceItem,
  SourceCodeOption,
} from "@/types/quote";

const CUSTOM_SERVICES_KEY = "pragma-works-custom-services-v1";
const SERVICE_OVERRIDES_KEY = "pragma-works-service-overrides-v1";

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

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
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


const defaultCatalogService = (): ServiceItem => ({
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

function cloneQuoteItems(items: QuoteItem[]): QuoteItem[] {
  return items.map((item) => ({ ...item, id: makeId("item") }));
}

function safeNumber(value: string | number, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(new Date(`${value}T12:00:00`));
}

export function CotizadorApp() {
  const [activeTab, setActiveTab] = useState<"quote" | "history" | "preview" | "catalog" | "rules" | "github">("quote");
  const [client, setClient] = useState<ClientDraft>(defaultClient);
  const [mode, setMode] = useState<QuoteMode>("hybrid");
  const [sourceCodeOption, setSourceCodeOption] = useState<SourceCodeOption>("none");
  const [rules, setRules] = useState<PricingRules>(defaultPricingRules);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customServices, setCustomServices] = useState<ServiceItem[]>([]);
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, ServiceItem>>({});
  const [catalogDraft, setCatalogDraft] = useState<ServiceItem>(defaultCatalogService());
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<ServiceCategory | "all">("all");
  const [catalogStatus, setCatalogStatus] = useState<"active" | "inactive" | "all">("active");
  const [manualDraft, setManualDraft] = useState(defaultManualService());
  const [saveManualToCatalog, setSaveManualToCatalog] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("draft");
  const [validUntil, setValidUntil] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(CUSTOM_SERVICES_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ServiceItem[];
        setCustomServices(parsed);
      } catch {
        window.localStorage.removeItem(CUSTOM_SERVICES_KEY);
      }
    }

    const overrideRaw = window.localStorage.getItem(SERVICE_OVERRIDES_KEY);
    if (overrideRaw) {
      try {
        const parsed = JSON.parse(overrideRaw) as Record<string, ServiceItem>;
        setServiceOverrides(parsed);
      } catch {
        window.localStorage.removeItem(SERVICE_OVERRIDES_KEY);
      }
    }

    setSavedQuotes(loadSavedQuotes());
    setValidUntil(getDefaultValidUntil());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(customServices));
  }, [customServices]);

  useEffect(() => {
    window.localStorage.setItem(SERVICE_OVERRIDES_KEY, JSON.stringify(serviceOverrides));
  }, [serviceOverrides]);

  const baseServicesWithOverrides = useMemo(
    () => initialServices.map((service) => serviceOverrides[service.id] ?? service),
    [serviceOverrides],
  );

  const catalogServices = useMemo(
    () => [...baseServicesWithOverrides, ...customServices],
    [baseServicesWithOverrides, customServices],
  );

  const services = useMemo(
    () => catalogServices.filter((service) => service.active),
    [catalogServices],
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

  const currentQuote = useMemo(
    () => savedQuotes.find((quote) => quote.id === currentQuoteId) ?? null,
    [currentQuoteId, savedQuotes],
  );

  const sortedSavedQuotes = useMemo(() => sortQuotesByUpdatedAt(savedQuotes), [savedQuotes]);

  const filteredCatalogServices = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase();

    return catalogServices
      .filter((service) => catalogCategory === "all" || service.category === catalogCategory)
      .filter((service) => catalogStatus === "all" || (catalogStatus === "active" ? service.active : !service.active))
      .filter((service) => {
        if (!search) return true;

        return [service.name, service.descriptionClient, service.descriptionInternal ?? "", categoryLabels[service.category]]
          .join(" ")
          .toLowerCase()
          .includes(search);
      });
  }, [catalogCategory, catalogSearch, catalogServices, catalogStatus]);

  const historyTotals = useMemo(() => {
    return savedQuotes.reduce(
      (acc, quote) => {
        acc.initial += quote.totals.suggestedInitialPayment;
        acc.monthly += quote.totals.suggestedMonthlyPayment;
        acc.accepted += quote.status === "accepted" ? 1 : 0;
        return acc;
      },
      { initial: 0, monthly: 0, accepted: 0 },
    );
  }, [savedQuotes]);

  function persistQuotes(nextQuotes: SavedQuote[]) {
    setSavedQuotes(nextQuotes);
    persistSavedQuotes(nextQuotes);
  }

  function showSavedMessage(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 2200);
  }

  function persistCustomServices(nextServices: ServiceItem[]) {
    setCustomServices(nextServices);
    window.localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(nextServices));
  }

  function persistServiceOverrides(nextOverrides: Record<string, ServiceItem>) {
    setServiceOverrides(nextOverrides);
    window.localStorage.setItem(SERVICE_OVERRIDES_KEY, JSON.stringify(nextOverrides));
  }

  function addService(service: ServiceItem) {
    setItems((current) => [...current, serviceToQuoteItem(service)]);
    setQuery("");
  }

  function startNewCatalogService() {
    setCatalogDraft(defaultCatalogService());
    setEditingCatalogId(null);
    showSavedMessage("Captura el nuevo servicio en el formulario del catálogo.");
  }

  function startEditCatalogService(service: ServiceItem) {
    setCatalogDraft({ ...service });
    setEditingCatalogId(service.id);
    setActiveTab("catalog");
  }

  function saveCatalogService() {
    if (!catalogDraft.name.trim()) {
      showSavedMessage("El servicio necesita nombre.");
      return;
    }

    if (catalogDraft.basePrice < 0) {
      showSavedMessage("El precio no puede ser negativo.");
      return;
    }

    const normalizedDraft: ServiceItem = {
      ...catalogDraft,
      id: editingCatalogId ?? makeId("svc-custom"),
      name: catalogDraft.name.trim(),
      descriptionClient: catalogDraft.descriptionClient.trim() || "Servicio agregado desde el catálogo editable.",
      descriptionInternal: catalogDraft.descriptionInternal?.trim() || "",
      basePrice: Math.max(0, catalogDraft.basePrice),
      estimatedHours: Math.max(0, catalogDraft.estimatedHours),
      source: "catalog",
    };

    const isBaseService = initialServices.some((service) => service.id === normalizedDraft.id);

    if (isBaseService) {
      persistServiceOverrides({ ...serviceOverrides, [normalizedDraft.id]: normalizedDraft });
    } else {
      const exists = customServices.some((service) => service.id === normalizedDraft.id);
      const nextServices = exists
        ? customServices.map((service) => (service.id === normalizedDraft.id ? normalizedDraft : service))
        : [normalizedDraft, ...customServices];

      persistCustomServices(nextServices);
    }

    setCatalogDraft(defaultCatalogService());
    setEditingCatalogId(null);
    showSavedMessage("Servicio guardado en catálogo local.");
  }

  function cloneServiceToCatalog(service: ServiceItem) {
    const cloned: ServiceItem = {
      ...service,
      id: makeId("svc-custom"),
      name: `${service.name} (ajustado)`,
      source: "catalog",
      active: true,
      requiresApproval: true,
      descriptionInternal: `Copia editable basada en ${service.name}.`,
    };

    persistCustomServices([cloned, ...customServices]);
    setCatalogDraft(cloned);
    setEditingCatalogId(cloned.id);
    showSavedMessage("Servicio copiado como concepto editable.");
  }

  function toggleCatalogService(service: ServiceItem) {
    const updated: ServiceItem = { ...service, active: !service.active };
    const isBaseService = initialServices.some((baseService) => baseService.id === service.id);

    if (isBaseService) {
      persistServiceOverrides({ ...serviceOverrides, [service.id]: updated });
    } else {
      persistCustomServices(customServices.map((current) => (current.id === service.id ? updated : current)));
    }

    showSavedMessage(updated.active ? "Servicio activado." : "Servicio desactivado del buscador.");
  }

  function deleteCustomCatalogService(serviceId: string) {
    const confirmed = window.confirm("¿Eliminar este servicio personalizado? No se eliminarán cotizaciones ya guardadas.");
    if (!confirmed) return;

    persistCustomServices(customServices.filter((service) => service.id !== serviceId));

    if (editingCatalogId === serviceId) {
      setCatalogDraft(defaultCatalogService());
      setEditingCatalogId(null);
    }

    showSavedMessage("Servicio personalizado eliminado.");
  }

  function resetBaseCatalogService(serviceId: string) {
    const nextOverrides = { ...serviceOverrides };
    delete nextOverrides[serviceId];
    persistServiceOverrides(nextOverrides);

    if (editingCatalogId === serviceId) {
      setCatalogDraft(defaultCatalogService());
      setEditingCatalogId(null);
    }

    showSavedMessage("Servicio base restaurado a su precio original.");
  }

  function clearCatalogDraft() {
    setCatalogDraft(defaultCatalogService());
    setEditingCatalogId(null);
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

  function buildSavedQuote(status: QuoteStatus): SavedQuote {
    const now = new Date().toISOString();
    const existing = currentQuote;

    return {
      id: existing?.id ?? makeId("quote"),
      folio: existing?.folio ?? getNextQuoteFolio(),
      status,
      client,
      mode,
      sourceCodeOption: mode === "rental" ? "none" : sourceCodeOption,
      rules,
      items,
      totals,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      validUntil: validUntil || getDefaultValidUntil(),
    };
  }

  function saveQuote(status: QuoteStatus = quoteStatus) {
    if (items.length === 0) {
      showSavedMessage("Agrega al menos un concepto antes de guardar.");
      return;
    }

    const quote = buildSavedQuote(status);
    const exists = savedQuotes.some((savedQuote) => savedQuote.id === quote.id);
    const nextQuotes = exists
      ? savedQuotes.map((savedQuote) => (savedQuote.id === quote.id ? quote : savedQuote))
      : [quote, ...savedQuotes];

    persistQuotes(nextQuotes);
    setCurrentQuoteId(quote.id);
    setQuoteStatus(status);
    showSavedMessage(`Cotización ${quote.folio} guardada como ${statusLabels[status]}.`);
  }

  function loadQuote(quote: SavedQuote) {
    setClient(quote.client);
    setMode(quote.mode);
    setSourceCodeOption(quote.sourceCodeOption);
    setRules(quote.rules);
    setItems(quote.items);
    setQuoteStatus(quote.status);
    setCurrentQuoteId(quote.id);
    setValidUntil(quote.validUntil || getDefaultValidUntil());
    setActiveTab("quote");
    showSavedMessage(`Cotización ${quote.folio} cargada.`);
  }

  function duplicateQuote(quote: SavedQuote) {
    const now = new Date().toISOString();
    const duplicatedItems = cloneQuoteItems(quote.items);
    const duplicatedTotals = calculateQuoteTotals(
      duplicatedItems,
      quote.mode,
      quote.sourceCodeOption,
      quote.rules,
    );

    const duplicatedQuote: SavedQuote = {
      ...quote,
      id: makeId("quote"),
      folio: getNextQuoteFolio(),
      status: "draft",
      items: duplicatedItems,
      totals: duplicatedTotals,
      createdAt: now,
      updatedAt: now,
      validUntil: getDefaultValidUntil(),
    };

    persistQuotes([duplicatedQuote, ...savedQuotes]);
    loadQuote(duplicatedQuote);
  }

  function deleteQuote(quoteId: string) {
    const quote = savedQuotes.find((savedQuote) => savedQuote.id === quoteId);
    const confirmed = window.confirm(`¿Eliminar ${quote?.folio ?? "esta cotización"}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    const nextQuotes = savedQuotes.filter((savedQuote) => savedQuote.id !== quoteId);
    persistQuotes(nextQuotes);

    if (currentQuoteId === quoteId) {
      resetQuote();
    }

    showSavedMessage("Cotización eliminada.");
  }

  function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
    const now = new Date().toISOString();
    const nextQuotes = savedQuotes.map((quote) =>
      quote.id === quoteId ? { ...quote, status, updatedAt: now } : quote,
    );

    persistQuotes(nextQuotes);

    if (currentQuoteId === quoteId) {
      setQuoteStatus(status);
    }
  }

  async function copySummary() {
    await navigator.clipboard.writeText(whatsappSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function openPrintPreview() {
    setActiveTab("preview");
  }

  function printQuote() {
    window.print();
  }

  function resetQuote() {
    setClient(defaultClient);
    setMode("hybrid");
    setSourceCodeOption("none");
    setItems([]);
    setQuery("");
    setQuoteStatus("draft");
    setCurrentQuoteId(null);
    setValidUntil(getDefaultValidUntil());
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
          <span className="pill">Sprint 1.3</span>
          <span className="pill">Catálogo editable</span>
        </div>
      </header>

      {savedMessage && <div className="toast-message">{savedMessage}</div>}

      <nav className="tabs" aria-label="Secciones del cotizador">
        <button className={`tab-button ${activeTab === "quote" ? "active" : ""}`} onClick={() => setActiveTab("quote")}>
          Nueva cotización
        </button>
        <button className={`tab-button ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          Historial ({savedQuotes.length})
        </button>
        <button className={`tab-button ${activeTab === "preview" ? "active" : ""}`} onClick={() => setActiveTab("preview")}>
          Vista / PDF
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
                <div className="quote-actions">
                  {currentQuote && <span className={`status-badge ${quoteStatus}`}>{currentQuote.folio} · {statusLabels[quoteStatus]}</span>}
                  <button className="btn ghost" onClick={resetQuote}>Nueva / limpiar</button>
                </div>
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
                <div className="field">
                  <label>Vigencia</label>
                  <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={quoteStatus} onChange={(event) => setQuoteStatus(event.target.value as QuoteStatus)}>
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviada</option>
                    <option value="accepted">Aceptada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
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
                  <h2>Guardar cotización</h2>
                  <p>En Sprint 1.1 se guarda localmente en este navegador.</p>
                </div>
              </div>
              <div className="grid">
                <div className="notice info">
                  {currentQuote ? (
                    <>Editando <strong>{currentQuote.folio}</strong>. Última actualización: {formatDateTime(currentQuote.updatedAt)}.</>
                  ) : (
                    <>Cotización nueva. Al guardar se asignará un folio automático tipo <strong>PW-000001</strong>.</>
                  )}
                </div>
                <div className="quote-actions stretch">
                  <button className="btn ghost" onClick={() => saveQuote("draft")}>Guardar borrador</button>
                  <button className="btn primary" onClick={() => saveQuote("sent")}>Guardar como enviada</button>
                  <button className="btn success" onClick={() => saveQuote("accepted")}>Marcar aceptada</button>
                  <button className="btn print" onClick={openPrintPreview}>Vista / PDF</button>
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

      {activeTab === "history" && (
        <section className="grid">
          <section className="kpi-row">
            <article className="card soft">
              <div className="kpi-label">Cotizaciones</div>
              <strong className="kpi-value">{savedQuotes.length}</strong>
            </article>
            <article className="card soft">
              <div className="kpi-label">Aceptadas</div>
              <strong className="kpi-value">{historyTotals.accepted}</strong>
            </article>
            <article className="card soft">
              <div className="kpi-label">Inicial cotizado</div>
              <strong className="kpi-value">{formatCurrency(historyTotals.initial)}</strong>
            </article>
            <article className="card soft">
              <div className="kpi-label">Mensual cotizado</div>
              <strong className="kpi-value">{formatCurrency(historyTotals.monthly)}</strong>
            </article>
          </section>

          <section className="card">
            <div className="card-title">
              <div>
                <h2>Historial de cotizaciones</h2>
                <p>Guardado local en este navegador. Después se migrará a base de datos.</p>
              </div>
              <button className="btn ghost" onClick={resetQuote}>Nueva cotización</button>
            </div>

            {sortedSavedQuotes.length === 0 ? (
              <div className="notice">Todavía no hay cotizaciones guardadas. Crea una cotización y presiona Guardar borrador o Guardar como enviada.</div>
            ) : (
              <div className="table-like">
                {sortedSavedQuotes.map((quote) => (
                  <article className="history-row" key={quote.id}>
                    <div>
                      <div className="history-heading">
                        <h4>{quote.folio}</h4>
                        <span className={`status-badge ${quote.status}`}>{statusLabels[quote.status]}</span>
                      </div>
                      <p>
                        <strong>{quote.client.company || quote.client.clientName || "Cliente pendiente"}</strong>
                        {quote.client.projectName ? ` · ${quote.client.projectName}` : " · Proyecto pendiente"}
                      </p>
                      <div className="meta-row">
                        <span className="meta">{formatQuoteMode(quote.mode)}</span>
                        <span className="meta">Inicial {formatCurrency(quote.totals.suggestedInitialPayment)}</span>
                        <span className="meta">Mensual {formatCurrency(quote.totals.suggestedMonthlyPayment)}</span>
                        <span className="meta">Vigente hasta {formatDate(quote.validUntil)}</span>
                        <span className="meta">Actualizada {formatDateTime(quote.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="history-actions">
                      <select value={quote.status} onChange={(event) => updateQuoteStatus(quote.id, event.target.value as QuoteStatus)}>
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviada</option>
                        <option value="accepted">Aceptada</option>
                        <option value="rejected">Rechazada</option>
                      </select>
                      <button className="btn primary" onClick={() => loadQuote(quote)}>Abrir</button>
                      <button className="btn ghost" onClick={() => duplicateQuote(quote)}>Duplicar</button>
                      <button className="btn danger" onClick={() => deleteQuote(quote.id)}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      )}

      {activeTab === "preview" && (
        <section className="grid printable-section">
          <div className="card no-print">
            <div className="card-title">
              <div>
                <h2>Vista formal de cotización</h2>
                <p>Revisa la propuesta antes de imprimirla o guardarla como PDF desde el navegador.</p>
              </div>
              <div className="quote-actions">
                <button className="btn ghost" onClick={() => setActiveTab("quote")}>Volver a editar</button>
                <button className="btn primary" onClick={() => saveQuote("draft")}>Guardar borrador</button>
                <button className="btn success" onClick={printQuote}>Imprimir / Guardar PDF</button>
              </div>
            </div>
            <div className="notice info">
              Para generar PDF: presiona <strong>Imprimir / Guardar PDF</strong> y en el cuadro de impresión selecciona <strong>Guardar como PDF</strong>. No se agregó librería externa todavía para mantener el sprint simple.
            </div>
          </div>

          <article className="print-page">
            <header className="print-header">
              <div>
                <div className="print-brand">
                  <span className="print-brand-mark">PW</span>
                  <div>
                    <h1>{companyProfile.name}</h1>
                    <p>{companyProfile.descriptor}</p>
                  </div>
                </div>
                <p className="print-slogan">{companyProfile.slogan}</p>
              </div>
              <div className="print-meta-box">
                <strong>Cotización</strong>
                <span>{currentQuote?.folio ?? "PRELIMINAR"}</span>
                <small>Fecha: {formatDate(new Date().toISOString().slice(0, 10))}</small>
                <small>Vigencia: {validUntil ? formatDate(validUntil) : "Pendiente"}</small>
              </div>
            </header>

            <section className="print-section two-columns-print">
              <div>
                <h2>Cliente</h2>
                <p><strong>Empresa:</strong> {client.company || "Pendiente"}</p>
                <p><strong>Contacto:</strong> {client.clientName || "Pendiente"}</p>
                <p><strong>Teléfono:</strong> {client.phone || "Pendiente"}</p>
                <p><strong>Correo:</strong> {client.email || "Pendiente"}</p>
              </div>
              <div>
                <h2>Proyecto</h2>
                <p><strong>Nombre:</strong> {client.projectName || "Pendiente de definir"}</p>
                <p><strong>Modalidad:</strong> {formatQuoteMode(mode)}</p>
                <p><strong>Código fuente:</strong> {formatSourceCodeOption(mode === "rental" ? "none" : sourceCodeOption)}</p>
                <p><strong>Ciudad:</strong> {companyProfile.city}</p>
              </div>
            </section>

            {client.notes && (
              <section className="print-section">
                <h2>Notas del levantamiento</h2>
                <p>{client.notes}</p>
              </section>
            )}

            <section className="print-section">
              <h2>Servicios incluidos</h2>
              {items.length === 0 ? (
                <p className="print-empty">No hay conceptos agregados todavía.</p>
              ) : (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Tipo</th>
                      <th>Cant.</th>
                      <th>Precio unitario</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          <span>{categoryLabels[item.category]}{item.requiresApproval ? " · sujeto a validación interna" : ""}</span>
                        </td>
                        <td>{formatBillingType(item.billingType)}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.unitPrice * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="print-section print-totals-section">
              <div className="print-notes">
                <h2>Condiciones y notas</h2>
                <ul>
                  {totals.commercialNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
              <div className="print-totals-box">
                <div><span>Subtotal único</span><strong>{formatCurrency(totals.oneTimeSubtotal)}</strong></div>
                <div><span>Ajustes comerciales</span><strong>{formatCurrency(totals.riskCharge + totals.urgencyCharge + totals.commissionCharge - totals.discountAmount + totals.sourceCodeCharge)}</strong></div>
                <div className="grand-total"><span>Pago inicial sugerido</span><strong>{formatCurrency(totals.suggestedInitialPayment)}</strong></div>
                {totals.suggestedMonthlyPayment > 0 && <div><span>Mensualidad sugerida</span><strong>{formatCurrency(totals.suggestedMonthlyPayment)}</strong></div>}
                {totals.suggestedAnnualRenewal > 0 && <div><span>Renovación anual sugerida</span><strong>{formatCurrency(totals.suggestedAnnualRenewal)}</strong></div>}
              </div>
            </section>

            <section className="print-section confidentiality-box">
              <h2>Confidencialidad</h2>
              <p>{companyProfile.confidentialityDisclaimer}</p>
            </section>

            <footer className="print-footer">
              <span>{companyProfile.name} · {companyProfile.descriptor}</span>
              <span>Documento generado desde Cotizador Pro</span>
            </footer>
          </article>
        </section>
      )}

      {activeTab === "catalog" && (
        <section className="grid two">
          <section className="card catalog-editor-card">
            <div className="card-title">
              <div>
                <h2>{editingCatalogId ? "Editar servicio" : "Nuevo servicio"}</h2>
                <p>Administra servicios y precios sin tocar código. Se guardan localmente en este navegador.</p>
              </div>
              <button className="btn ghost" onClick={clearCatalogDraft}>Limpiar formulario</button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Nombre del servicio</label>
                <input
                  value={catalogDraft.name}
                  onChange={(event) => setCatalogDraft({ ...catalogDraft, name: event.target.value })}
                  placeholder="Ej. Módulo de membresías"
                />
              </div>
              <div className="field">
                <label>Categoría</label>
                <select value={catalogDraft.category} onChange={(event) => setCatalogDraft({ ...catalogDraft, category: event.target.value as ServiceCategory })}>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Tipo de cobro</label>
                <select value={catalogDraft.billingType} onChange={(event) => setCatalogDraft({ ...catalogDraft, billingType: event.target.value as BillingType })}>
                  <option value="one_time">Único</option>
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                  <option value="hourly">Por hora</option>
                </select>
              </div>
              <div className="field">
                <label>Precio público</label>
                <input
                  type="number"
                  min="0"
                  value={catalogDraft.basePrice}
                  onChange={(event) => setCatalogDraft({ ...catalogDraft, basePrice: safeNumber(event.target.value) })}
                />
              </div>
              <div className="field">
                <label>Horas estimadas</label>
                <input
                  type="number"
                  min="0"
                  value={catalogDraft.estimatedHours}
                  onChange={(event) => setCatalogDraft({ ...catalogDraft, estimatedHours: safeNumber(event.target.value, 1) })}
                />
              </div>
              <div className="field">
                <label>Estatus</label>
                <select value={catalogDraft.active ? "active" : "inactive"} onChange={(event) => setCatalogDraft({ ...catalogDraft, active: event.target.value === "active" })}>
                  <option value="active">Activo en buscador</option>
                  <option value="inactive">Inactivo / oculto</option>
                </select>
              </div>
              <div className="field">
                <label>Revisión interna</label>
                <select value={catalogDraft.requiresApproval ? "yes" : "no"} onChange={(event) => setCatalogDraft({ ...catalogDraft, requiresApproval: event.target.value === "yes" })}>
                  <option value="no">No requiere</option>
                  <option value="yes">Sí requiere aprobación</option>
                </select>
              </div>
              <div className="field full">
                <label>Descripción para cliente</label>
                <textarea
                  value={catalogDraft.descriptionClient}
                  onChange={(event) => setCatalogDraft({ ...catalogDraft, descriptionClient: event.target.value })}
                  placeholder="Explicación comercial clara para incluir en propuestas."
                />
              </div>
              <div className="field full">
                <label>Nota interna</label>
                <textarea
                  value={catalogDraft.descriptionInternal ?? ""}
                  onChange={(event) => setCatalogDraft({ ...catalogDraft, descriptionInternal: event.target.value })}
                  placeholder="Criterios, riesgos, pendientes o notas para uso interno."
                />
              </div>
            </div>

            <div className="split-actions">
              <button className="btn success" onClick={saveCatalogService} disabled={!catalogDraft.name.trim()}>
                {editingCatalogId ? "Guardar cambios" : "Crear servicio"}
              </button>
              <button className="btn ghost" onClick={startNewCatalogService}>Nuevo desde cero</button>
            </div>

            <div className="notice info">
              Los servicios base pueden editarse mediante una anulación local. Si después se agrega base de datos, estas reglas se migran al catálogo administrable real.
            </div>
          </section>

          <section className="card">
            <div className="card-title">
              <div>
                <h2>Catálogo administrable local</h2>
                <p>Edita precios, activa/desactiva servicios y agrega conceptos permanentes para futuras cotizaciones.</p>
              </div>
            </div>

            <div className="catalog-toolbar">
              <div className="field">
                <label>Buscar</label>
                <input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Nombre, descripción o categoría..." />
              </div>
              <div className="field">
                <label>Categoría</label>
                <select value={catalogCategory} onChange={(event) => setCatalogCategory(event.target.value as ServiceCategory | "all")}>
                  <option value="all">Todas</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Estatus</label>
                <select value={catalogStatus} onChange={(event) => setCatalogStatus(event.target.value as "active" | "inactive" | "all")}>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="all">Todos</option>
                </select>
              </div>
            </div>

            <div className="catalog-list">
              {filteredCatalogServices.length === 0 ? (
                <div className="notice">No hay servicios con esos filtros.</div>
              ) : (
                filteredCatalogServices.map((service) => {
                  const isBaseService = initialServices.some((baseService) => baseService.id === service.id);
                  const hasOverride = Boolean(serviceOverrides[service.id]);
                  const isCustomService = customServices.some((customService) => customService.id === service.id);

                  return (
                    <article className={`service-row catalog-row ${service.active ? "" : "inactive"}`} key={service.id}>
                      <div>
                        <h4>{service.name}</h4>
                        <p>{service.descriptionClient}</p>
                        <div className="meta-row">
                          <span className="meta">{categoryLabels[service.category]}</span>
                          <span className="meta">{formatBillingType(service.billingType)}</span>
                          <span className="meta">{formatCurrency(service.basePrice)}</span>
                          <span className="meta">{service.estimatedHours} h</span>
                          <span className="meta">{service.active ? "Activo" : "Inactivo"}</span>
                          <span className="meta">{isBaseService ? (hasOverride ? "Base ajustado" : "Base") : "Personalizado"}</span>
                        </div>
                      </div>
                      <div className="catalog-actions">
                        <button className="btn ghost small" onClick={() => startEditCatalogService(service)}>Editar</button>
                        <button className="btn primary small" onClick={() => addService(service)} disabled={!service.active}>Cotizar</button>
                        <button className="btn warning small" onClick={() => toggleCatalogService(service)}>{service.active ? "Desactivar" : "Activar"}</button>
                        {isBaseService && <button className="btn ghost small" onClick={() => cloneServiceToCatalog(service)}>Copiar</button>}
                        {isBaseService && hasOverride && <button className="btn danger small" onClick={() => resetBaseCatalogService(service.id)}>Restaurar</button>}
                        {isCustomService && <button className="btn danger small" onClick={() => deleteCustomCatalogService(service.id)}>Eliminar</button>}
                      </div>
                    </article>
                  );
                })
              )}
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
                <h2>GitHub</h2>
                <p>Comandos sugeridos para cerrar el Sprint 1.3.</p>
              </div>
            </div>
            <pre className="preview">{`git status
git add .
git commit -m "feat: agregar catalogo editable local"
git push -u origin sprint-1-3-catalogo-editable`}</pre>
          </section>
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Siguiente sprint</h2>
                <p>No meter base de datos hasta validar el catálogo editable y el flujo comercial.</p>
              </div>
            </div>
            <div className="grid">
              <div className="service-row"><div><h4>Sprint 1.3</h4><p>Catálogo editable local: crear, editar, activar, desactivar y ajustar precios.</p></div></div>
              <div className="service-row"><div><h4>Sprint 1.4</h4><p>Reportes simples desde cotizaciones guardadas.</p></div></div>
              <div className="service-row"><div><h4>Sprint 2</h4><p>Agregar login, base de datos y catálogo administrable en servidor.</p></div></div>
              <div className="service-row"><div><h4>Sprint 3</h4><p>Docker, PostgreSQL, deploy y PWA instalable.</p></div></div>
            </div>
          </section>
        </section>
      )}

      <p className="footer-note">
        {companyProfile.name} · Sprint 1.3 · Catálogo editable · Sin datos sensibles · Base limpia para GitHub.
      </p>
    </main>
  );
}
