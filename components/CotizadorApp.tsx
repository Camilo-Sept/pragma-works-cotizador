"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
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
import { syncQuoteToDatabase } from "@/lib/quoteDatabaseClient";
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
  UserRole,
} from "@/types/quote";

const CUSTOM_SERVICES_KEY = "pragma-works-custom-services-v1";
const SERVICE_OVERRIDES_KEY = "pragma-works-service-overrides-v1";

const CURRENT_ROLE_KEY = "pragma-works-current-role-v1";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type PermissionKey =
  | "create_quote"
  | "edit_draft_quotes"
  | "change_quote_status"
  | "delete_draft_quotes"
  | "archive_locked_quotes"
  | "view_reports"
  | "edit_catalog"
  | "edit_pricing_rules"
  | "export_data"
  | "view_github";

const roleLabels: Record<UserRole, string> = {
  admin: "ADMIN",
  supervisor: "SUPERVISOR",
  ventas: "VENTAS",
  operacion: "OPERACIÓN",
  lectura: "LECTURA",
};

const roleDescriptions: Record<UserRole, string> = {
  admin: "Control total de catálogo, precios, reportes, estados y reglas.",
  supervisor: "Supervisa cotizaciones, estados, reportes y aprobaciones.",
  ventas: "Crea cotizaciones, genera PDF y da seguimiento comercial.",
  operacion: "Consulta proyectos aceptados, fechas objetivo y carga de trabajo.",
  lectura: "Consulta información sin modificar ni exportar.",
};

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  admin: [
    "create_quote",
    "edit_draft_quotes",
    "change_quote_status",
    "delete_draft_quotes",
    "archive_locked_quotes",
    "view_reports",
    "edit_catalog",
    "edit_pricing_rules",
    "export_data",
    "view_github",
  ],
  supervisor: [
    "create_quote",
    "edit_draft_quotes",
    "change_quote_status",
    "archive_locked_quotes",
    "view_reports",
    "export_data",
  ],
  ventas: ["create_quote", "edit_draft_quotes", "view_reports", "export_data"],
  operacion: ["view_reports"],
  lectura: [],
};

const tabsByRole: Record<UserRole, Array<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit" | "approvals">> = {
  admin: ["quote", "history", "reports", "preview", "catalog", "users", "audit", "approvals"],
  supervisor: ["quote", "history", "reports", "preview"],
  ventas: ["quote", "history", "reports", "preview"],
  operacion: ["history", "reports"],
  lectura: ["history", "reports"],
};
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
  targetDeliveryDate: "",
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
  visibleToClient: true,
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
});

const internalCostCatalog: Array<Omit<ServiceItem, "active" | "source">> = [
  {
    id: "internal-hosting",
    name: "Hosting",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Hospedaje administrado del proyecto.",
    billingType: "monthly",
    basePrice: 900,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-domain",
    name: "Dominio",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Registro o renovación de dominio.",
    billingType: "annual",
    basePrice: 450,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-server",
    name: "Servidor",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Servidor, VPS o instancia cloud.",
    billingType: "monthly",
    basePrice: 1200,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-whatsapp-api",
    name: "API WhatsApp",
    category: "automation",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Consumo, proveedor o integración de WhatsApp.",
    billingType: "monthly",
    basePrice: 1000,
    estimatedHours: 1,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-maps-api",
    name: "Maps API",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Consumo de mapas, geocoding o lugares.",
    billingType: "monthly",
    basePrice: 1200,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-license",
    name: "Licencia",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Licencia de software o herramienta externa.",
    billingType: "monthly",
    basePrice: 800,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-database",
    name: "Base de datos",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Servicio administrado de base de datos.",
    billingType: "monthly",
    basePrice: 700,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-storage",
    name: "Almacenamiento",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Storage de archivos, respaldos o media.",
    billingType: "monthly",
    basePrice: 350,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-email",
    name: "Correo",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Cuentas de correo, SMTP o envio transaccional.",
    billingType: "monthly",
    basePrice: 300,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-ssl",
    name: "SSL",
    category: "infrastructure",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Certificado SSL o configuracion HTTPS.",
    billingType: "annual",
    basePrice: 0,
    estimatedHours: 0,
    requiresApproval: true,
    visibleToClient: false,
  },
  {
    id: "internal-support",
    name: "Soporte",
    category: "support",
    descriptionClient: "Costo interno no visible en propuesta comercial.",
    descriptionInternal: "Bolsa de soporte o acompanamiento interno.",
    billingType: "hourly",
    basePrice: 650,
    estimatedHours: 1,
    requiresApproval: true,
    visibleToClient: false,
  },
];

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
    visibleToClient: service.visibleToClient ?? true,
    notes: service.descriptionInternal,
  };
}

function cloneQuoteItems(items: QuoteItem[]): QuoteItem[] {
  return items.map((item) => ({ ...item, id: makeId("item") }));
}

function quoteItemFromInternalCost(
  cost: Omit<ServiceItem, "id" | "active" | "source">,
  quantity = 1,
): QuoteItem {
  return {
    id: makeId("internal-item"),
    name: cost.name.trim(),
    category: cost.category,
    billingType: cost.billingType,
    unitPrice: Math.max(0, cost.basePrice),
    quantity: Math.max(1, quantity),
    estimatedHours: Math.max(0, cost.estimatedHours),
    source: "manual",
    requiresApproval: true,
    visibleToClient: cost.visibleToClient ?? false,
    notes: cost.descriptionInternal?.trim() || "Costo interno agregado a la cotizacion.",
  };
}

function sumItemsByBillingType(items: QuoteItem[], billingTypes: BillingType[]) {
  return items
    .filter((item) => billingTypes.includes(item.billingType))
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
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

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getTodayInputValue() {
  const today = getStartOfToday();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysUntil(dateValue?: string) {
  if (!dateValue) return null;

  const targetDate = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(targetDate.getTime())) return null;

  const today = getStartOfToday();
  const difference = targetDate.getTime() - today.getTime();
  return Math.round(difference / 86_400_000);
}

function formatDayDistance(days: number | null) {
  if (days === null) return "Sin fecha";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Mañana";
  if (days > 1) return `En ${days} días`;
  if (days === -1) return "Ayer";
  return `Hace ${Math.abs(days)} días`;
}

function isQuoteUpdatedInRange(quote: SavedQuote, fromDate: string, toDate: string) {
  const updatedTime = new Date(quote.updatedAt).getTime();
  const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
  const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

  if (fromTime && updatedTime < fromTime) return false;
  if (toTime && updatedTime > toTime) return false;
  return true;
}

function getDateInputValue(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function isPastDateInputValue(value?: string) {
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

function openDatePicker(inputId: string) {
  const input = document.getElementById(inputId);
  if (!(input instanceof HTMLInputElement)) return;

  input.showPicker?.();
  input.focus();
}

function escapeCsvValue(value: string | number) {
  const text = String(value ?? "");
  if ([",", "\n", "\r", '"'].some((char) => text.includes(char))) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}


function isUserRole(value: string | null): value is UserRole {
  return value === "admin" || value === "supervisor" || value === "ventas" || value === "operacion" || value === "lectura";
}

function isLockedQuote(quote: SavedQuote | null) {
  return Boolean(quote && quote.status !== "draft");
}

function getBaseFolio(folio: string) {
  return folio.replace(/-R\d+$/i, "");
}

function getNextRevisionNumber(quotes: SavedQuote[], quote: SavedQuote) {
  const baseFolio = getBaseFolio(quote.folio);
  const sameFamily = quotes.filter((savedQuote) => getBaseFolio(savedQuote.folio) === baseFolio);
  const numbers = sameFamily.map((savedQuote) => savedQuote.revisionNumber ?? (/-R(\d+)$/i.exec(savedQuote.folio)?.[1] ? Number(/-R(\d+)$/i.exec(savedQuote.folio)?.[1]) : 1));
  return Math.max(1, ...numbers) + 1;
}

function getNextRevisionFolio(quotes: SavedQuote[], quote: SavedQuote) {
  const nextRevision = getNextRevisionNumber(quotes, quote);
  return `${getBaseFolio(quote.folio)}-R${nextRevision}`;
}

function mergeSavedQuotes(localQuotes: SavedQuote[], databaseQuotes: SavedQuote[]) {
  const quotesById = new Map<string, SavedQuote>();

  for (const quote of [...localQuotes, ...databaseQuotes]) {
    const current = quotesById.get(quote.id);
    if (!current || new Date(quote.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
      quotesById.set(quote.id, quote);
    }
  }

  return sortQuotesByUpdatedAt([...quotesById.values()]);
}

export function CotizadorApp() {
  const [activeTab, setActiveTab] = useState<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit" | "approvals">("quote");
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const [baseCatalogServices, setBaseCatalogServices] = useState<ServiceItem[]>(initialServices);
  const [catalogSource, setCatalogSource] = useState<"database" | "fallback">("fallback");
  const [rulesSource, setRulesSource] = useState<"database" | "fallback">("fallback");
  const [quotesSource, setQuotesSource] = useState<"database" | "local">("local");
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
  const [internalCostDraft, setInternalCostDraft] = useState(defaultInternalCostDraft());
  const [internalCostQuantity, setInternalCostQuantity] = useState(1);
  const [internalCostSearch, setInternalCostSearch] = useState("");
  const [saveManualToCatalog, setSaveManualToCatalog] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("draft");
  const [validUntil, setValidUntil] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [reportStatus, setReportStatus] = useState<QuoteStatus | "all">("all");
  const [reportMode, setReportMode] = useState<QuoteMode | "all">("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

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

    const localQuotes = loadSavedQuotes();
    setSavedQuotes(localQuotes);
    setValidUntil(getDefaultValidUntil());

    const storedRole = window.localStorage.getItem(CURRENT_ROLE_KEY);
    if (isUserRole(storedRole)) {
      setCurrentRole(storedRole);
    }

    let cancelled = false;

    async function loadQuotesFromDatabase() {
      try {
        const response = await fetch("/api/quotes", { cache: "no-store" });
        if (!response.ok) {
          setQuotesSource("local");
          return;
        }

        const data = (await response.json()) as { ok?: boolean; quotes?: SavedQuote[] };
        if (cancelled || !data.ok || !Array.isArray(data.quotes)) return;

        const mergedQuotes = mergeSavedQuotes(localQuotes, data.quotes);
        setSavedQuotes(mergedQuotes);
        persistSavedQuotes(mergedQuotes);
        setQuotesSource("database");
      } catch (error) {
        console.warn("No se pudo cargar historial desde BD. Se usa historial local.", error);
        if (!cancelled) {
          setQuotesSource("local");
        }
      }
    }

    loadQuotesFromDatabase();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { ok?: boolean; user?: AuthUser | null };

        if (!cancelled && response.ok && data.ok && data.user) {
          setAuthUser(data.user);
          setCurrentRole(data.user.role);
        }
      } catch (error) {
        console.warn("No se pudo validar la sesión.", error);
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDefaultsFromDatabase() {
      try {
        const [servicesResponse, rulesResponse] = await Promise.all([
          fetch("/api/services", { cache: "no-store" }),
          fetch("/api/pricing-rules/default", { cache: "no-store" }),
        ]);

        if (servicesResponse.ok) {
          const servicesData = (await servicesResponse.json()) as { services?: ServiceItem[] };
          if (!cancelled && Array.isArray(servicesData.services) && servicesData.services.length > 0) {
            setBaseCatalogServices(servicesData.services);
            setCatalogSource("database");
          }
        } else if (!cancelled) {
          setCatalogSource("fallback");
        }

        if (rulesResponse.ok) {
          const rulesData = (await rulesResponse.json()) as { rules?: PricingRules };
          if (!cancelled && rulesData.rules) {
            setRules(rulesData.rules);
            setRulesSource("database");
          }
        } else if (!cancelled) {
          setRulesSource("fallback");
        }
      } catch (error) {
        console.warn("No se pudo cargar catálogo/reglas desde BD. Se usa respaldo local.", error);

        if (!cancelled) {
          setBaseCatalogServices(initialServices);
          setCatalogSource("fallback");
          setRulesSource("fallback");
        }
      }
    }

    loadDefaultsFromDatabase();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CURRENT_ROLE_KEY, currentRole);

    if (!tabsByRole[currentRole].includes(activeTab)) {
      setActiveTab(tabsByRole[currentRole][0]);
    }
  }, [activeTab, currentRole]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(customServices));
  }, [customServices]);

  useEffect(() => {
    window.localStorage.setItem(SERVICE_OVERRIDES_KEY, JSON.stringify(serviceOverrides));
  }, [serviceOverrides]);

  const baseServicesWithOverrides = useMemo<ServiceItem[]>(
    () => baseCatalogServices.map((service: ServiceItem) => serviceOverrides[service.id] ?? service),
    [baseCatalogServices, serviceOverrides],
  );

  const catalogServices = useMemo<ServiceItem[]>(
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

  const estimatedWorkHours = useMemo(
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
  const internalCostOneTimeSubtotal = useMemo(() => sumItemsByBillingType(internalQuoteItems, ["one_time", "hourly"]), [internalQuoteItems]);
  const internalCostMonthlySubtotal = useMemo(() => sumItemsByBillingType(internalQuoteItems, ["monthly"]), [internalQuoteItems]);
  const internalCostAnnualSubtotal = useMemo(() => sumItemsByBillingType(internalQuoteItems, ["annual"]), [internalQuoteItems]);
  const internalCostSubtotal = internalCostOneTimeSubtotal + internalCostMonthlySubtotal + internalCostAnnualSubtotal;

  const filteredInternalCostCatalog = useMemo(() => {
    const search = internalCostSearch.trim().toLowerCase();

    if (!search) return internalCostCatalog;

    return internalCostCatalog.filter((cost) =>
      [
        cost.name,
        cost.descriptionInternal ?? "",
        categoryLabels[cost.category],
        cost.billingType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [internalCostSearch]);

  const whatsappSummary = useMemo(
    () => buildWhatsAppSummary({ client, items: visibleQuoteItems, mode, sourceCodeOption, totals }),
    [client, visibleQuoteItems, mode, sourceCodeOption, totals],
  );

  const currentQuote = useMemo(
    () => savedQuotes.find((quote) => quote.id === currentQuoteId) ?? null,
    [currentQuoteId, savedQuotes],
  );

  const roleCan = (permission: PermissionKey) => rolePermissions[currentRole].includes(permission);
  const availableTabs = tabsByRole[currentRole];
  const currentQuoteLocked = isLockedQuote(currentQuote);
  const canEditCurrentQuote = roleCan("edit_draft_quotes") && !currentQuoteLocked;
  const canCreateQuotes = roleCan("create_quote");
  const canChangeQuoteStatus = roleCan("change_quote_status");
  const canExportReports = roleCan("export_data");
  const canEditCatalog = roleCan("edit_catalog");
  const canEditPricingRules = roleCan("edit_pricing_rules");

  const sortedSavedQuotes = useMemo(() => sortQuotesByUpdatedAt(savedQuotes).filter((quote) => !quote.archivedAt), [savedQuotes]);

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
    return savedQuotes.filter((quote) => !quote.archivedAt).reduce(
      (acc, quote) => {
        acc.initial += quote.totals.suggestedInitialPayment;
        acc.monthly += quote.totals.suggestedMonthlyPayment;
        acc.accepted += quote.status === "accepted" ? 1 : 0;
        return acc;
      },
      { initial: 0, monthly: 0, accepted: 0 },
    );
  }, [savedQuotes]);

  const reportQuotes = useMemo(() => {
    const search = reportSearch.trim().toLowerCase();

    return sortQuotesByUpdatedAt(savedQuotes.filter((quote) => !quote.archivedAt)).filter((quote) => {
      if (reportStatus !== "all" && quote.status !== reportStatus) return false;
      if (reportMode !== "all" && quote.mode !== reportMode) return false;

      if (!isQuoteUpdatedInRange(quote, reportFromDate, reportToDate)) return false;

      if (!search) return true;

      return [
        quote.folio,
        quote.client.company,
        quote.client.clientName,
        quote.client.projectName,
        quote.client.email,
        quote.client.phone,
        quote.client.targetDeliveryDate ?? "",
        statusLabels[quote.status],
        formatQuoteMode(quote.mode),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [reportFromDate, reportMode, reportSearch, reportStatus, reportToDate, savedQuotes]);

  const reportTotals = useMemo(() => {
    return reportQuotes.reduce(
      (acc, quote) => {
        acc.initial += quote.totals.suggestedInitialPayment;
        acc.monthly += quote.totals.suggestedMonthlyPayment;
        acc.annual += quote.totals.suggestedAnnualRenewal;
        acc.hours += quote.totals.estimatedHours;
        acc.accepted += quote.status === "accepted" ? 1 : 0;
        acc.sent += quote.status === "sent" ? 1 : 0;
        acc.draft += quote.status === "draft" ? 1 : 0;
        acc.rejected += quote.status === "rejected" ? 1 : 0;

        if (quote.status === "accepted") {
          acc.acceptedInitial += quote.totals.suggestedInitialPayment;
          acc.acceptedMonthly += quote.totals.suggestedMonthlyPayment;
          acc.acceptedAnnual += quote.totals.suggestedAnnualRenewal;
          acc.acceptedHours += quote.totals.estimatedHours;
        }

        if (quote.status === "sent") {
          acc.sentInitial += quote.totals.suggestedInitialPayment;
          acc.sentMonthly += quote.totals.suggestedMonthlyPayment;
        }

        if (quote.status === "draft") {
          acc.draftInitial += quote.totals.suggestedInitialPayment;
        }
        return acc;
      },
      {
        initial: 0,
        monthly: 0,
        annual: 0,
        hours: 0,
        accepted: 0,
        sent: 0,
        draft: 0,
        rejected: 0,
        acceptedInitial: 0,
        acceptedMonthly: 0,
        acceptedAnnual: 0,
        acceptedHours: 0,
        sentInitial: 0,
        sentMonthly: 0,
        draftInitial: 0,
      },
    );
  }, [reportQuotes]);

  const reportStatusSummary = useMemo(() => {
    const base: Record<QuoteStatus, { count: number; initial: number; monthly: number; annual: number; hours: number }> = {
      draft: { count: 0, initial: 0, monthly: 0, annual: 0, hours: 0 },
      sent: { count: 0, initial: 0, monthly: 0, annual: 0, hours: 0 },
      accepted: { count: 0, initial: 0, monthly: 0, annual: 0, hours: 0 },
      rejected: { count: 0, initial: 0, monthly: 0, annual: 0, hours: 0 },
    };

    reportQuotes.forEach((quote) => {
      base[quote.status].count += 1;
      base[quote.status].initial += quote.totals.suggestedInitialPayment;
      base[quote.status].monthly += quote.totals.suggestedMonthlyPayment;
      base[quote.status].annual += quote.totals.suggestedAnnualRenewal;
      base[quote.status].hours += quote.totals.estimatedHours;
    });

    return base;
  }, [reportQuotes]);

  const topReportQuotes = useMemo(() => {
    return [...reportQuotes]
      .filter((quote) => quote.status === "sent" || quote.status === "draft")
      .sort((a, b) => b.totals.suggestedInitialPayment - a.totals.suggestedInitialPayment)
      .slice(0, 8);
  }, [reportQuotes]);

  const reportFilterLabels = useMemo(() => {
    const filters: string[] = [];
    const search = reportSearch.trim();

    if (search) filters.push(`Búsqueda: “${search}”`);
    if (reportStatus !== "all") filters.push(`Estado: ${statusLabels[reportStatus]}`);
    if (reportMode !== "all") filters.push(`Modalidad: ${formatQuoteMode(reportMode)}`);
    if (reportFromDate) filters.push(`Actualizadas desde: ${formatDate(reportFromDate)}`);
    if (reportToDate) filters.push(`Actualizadas hasta: ${formatDate(reportToDate)}`);

    return filters;
  }, [reportFromDate, reportMode, reportSearch, reportStatus, reportToDate]);

  const reportBusinessSummary = useMemo(() => {
    const sentOrDraftQuotes = reportQuotes.filter((quote) => quote.status === "sent" || quote.status === "draft");
    const acceptedQuotes = reportQuotes.filter((quote) => quote.status === "accepted");

    const quotesDueSoon = sentOrDraftQuotes.filter((quote) => {
      const days = getDaysUntil(quote.validUntil);
      return days !== null && days >= 0 && days <= 7;
    });

    const expiredQuotes = sentOrDraftQuotes.filter((quote) => {
      const days = getDaysUntil(quote.validUntil);
      return days !== null && days < 0;
    });

    const acceptedWithDeliveryDate = acceptedQuotes.filter((quote) => quote.client.targetDeliveryDate);
    const acceptedWithoutDeliveryDate = acceptedQuotes.length - acceptedWithDeliveryDate.length;

    const deliveryThisWeek = acceptedWithDeliveryDate.filter((quote) => {
      const days = getDaysUntil(quote.client.targetDeliveryDate);
      return days !== null && days >= 0 && days <= 7;
    });

    const deliveryThisMonth = acceptedWithDeliveryDate.filter((quote) => {
      const days = getDaysUntil(quote.client.targetDeliveryDate);
      return days !== null && days >= 0 && days <= 30;
    });

    const overdueDelivery = acceptedWithDeliveryDate.filter((quote) => {
      const days = getDaysUntil(quote.client.targetDeliveryDate);
      return days !== null && days < 0;
    });

    return {
      quotesDueSoon: quotesDueSoon.length,
      expiredQuotes: expiredQuotes.length,
      acceptedWithoutDeliveryDate,
      deliveryThisWeek: deliveryThisWeek.length,
      deliveryThisWeekHours: deliveryThisWeek.reduce((total, quote) => total + quote.totals.estimatedHours, 0),
      deliveryThisMonth: deliveryThisMonth.length,
      deliveryThisMonthHours: deliveryThisMonth.reduce((total, quote) => total + quote.totals.estimatedHours, 0),
      overdueDelivery: overdueDelivery.length,
    };
  }, [reportQuotes]);

  const deliveryReportQuotes = useMemo(() => {
    return [...reportQuotes]
      .filter((quote) => quote.status === "accepted")
      .sort((a, b) => {
        const aDate = a.client.targetDeliveryDate || "9999-12-31";
        const bDate = b.client.targetDeliveryDate || "9999-12-31";
        return aDate.localeCompare(bDate);
      })
      .slice(0, 8);
  }, [reportQuotes]);

  const expirationReportQuotes = useMemo(() => {
    return [...reportQuotes]
      .filter((quote) => quote.status !== "rejected")
      .sort((a, b) => (a.validUntil || "9999-12-31").localeCompare(b.validUntil || "9999-12-31"))
      .slice(0, 8);
  }, [reportQuotes]);

  const conversionRate = reportQuotes.length > 0 ? Math.round((reportTotals.accepted / reportQuotes.length) * 100) : 0;

  function persistQuotes(nextQuotes: SavedQuote[]) {
    setSavedQuotes(nextQuotes);
    persistSavedQuotes(nextQuotes);
  }

  function showSavedMessage(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 2200);
  }

  function syncSavedQuoteToDatabase(quote: SavedQuote) {
    void syncQuoteToDatabase(quote)
      .then((result) => {
        if (result.ok) {
          showSavedMessage(`Cotización ${quote.folio} guardada localmente y sincronizada con BD.`);
          return;
        }

        console.warn("No se pudo sincronizar la cotización con BD.", result.error);
        showSavedMessage(`Cotización ${quote.folio} guardada localmente. No se pudo sincronizar con BD.`);
      })
      .catch((error) => {
        console.warn("No se pudo sincronizar la cotización con BD.", error);
        showSavedMessage(`Cotización ${quote.folio} guardada localmente. No se pudo sincronizar con BD.`);
      });
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
    if (!canEditCurrentQuote) {
      showSavedMessage(currentQuoteLocked ? "Cotización bloqueada. Crea una revisión para modificar conceptos." : "Tu rol no permite editar cotizaciones.");
      return;
    }

    setItems((current) => [...current, serviceToQuoteItem(service)]);
    setQuery("");
  }

  function startNewCatalogService() {
    if (!canEditCatalog) {
      showSavedMessage("Tu rol no permite crear servicios de catálogo.");
      return;
    }

    setCatalogDraft(defaultCatalogService());
    setEditingCatalogId(null);
    showSavedMessage("Captura el nuevo servicio en el formulario del catálogo.");
  }

  function startEditCatalogService(service: ServiceItem) {
    if (!canEditCatalog) {
      showSavedMessage("Tu rol no permite editar servicios de catálogo.");
      return;
    }

    setCatalogDraft({ ...service });
    setEditingCatalogId(service.id);
    setActiveTab("catalog");
  }

  function saveCatalogService() {
    if (!canEditCatalog) {
      showSavedMessage("Tu rol no permite guardar cambios de catálogo.");
      return;
    }

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

    const isBaseService = baseCatalogServices.some((service) => service.id === normalizedDraft.id);

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
    if (!canEditCatalog) {
      showSavedMessage("Tu rol no permite copiar servicios al catálogo.");
      return;
    }

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
    if (!canEditCatalog) {
      showSavedMessage("Tu rol no permite activar o desactivar servicios.");
      return;
    }

    const updated: ServiceItem = { ...service, active: !service.active };
    const isBaseService = baseCatalogServices.some((baseService) => baseService.id === service.id);

    if (isBaseService) {
      persistServiceOverrides({ ...serviceOverrides, [service.id]: updated });
    } else {
      persistCustomServices(customServices.map((current) => (current.id === service.id ? updated : current)));
    }

    showSavedMessage(updated.active ? "Servicio activado." : "Servicio desactivado del buscador.");
  }

  function deleteCustomCatalogService(serviceId: string) {
    if (!canEditCatalog) {
      showSavedMessage("Tu rol no permite eliminar servicios personalizados.");
      return;
    }

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
    if (!canEditCatalog) {
      showSavedMessage("Tu rol no permite restaurar servicios base.");
      return;
    }

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
    if (!canEditCurrentQuote) {
      showSavedMessage(currentQuoteLocked ? "Cotización bloqueada. Crea una revisión para agregar conceptos." : "Tu rol no permite editar cotizaciones.");
      return;
    }

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

  function addInternalCost() {
    if (!canEditCurrentQuote) {
      showSavedMessage(currentQuoteLocked ? "Cotización bloqueada. Crea una revisión para agregar costos internos." : "Tu rol no permite editar cotizaciones.");
      return;
    }

    if (!internalCostDraft.name.trim()) {
      showSavedMessage("El costo interno necesita nombre.");
      return;
    }

    if (internalCostDraft.basePrice < 0) {
      showSavedMessage("El costo interno no puede tener importe negativo.");
      return;
    }

    const item = quoteItemFromInternalCost(internalCostDraft, internalCostQuantity);

    setItems((current) => [...current, item]);
    setInternalCostDraft(defaultInternalCostDraft());
    setInternalCostQuantity(1);
    showSavedMessage("Costo interno agregado. Sí suma al precio, pero no se lista al cliente.");
  }

  function addInternalCatalogCost(cost: Omit<ServiceItem, "active" | "source">) {
    if (!canEditCurrentQuote) {
      showSavedMessage(currentQuoteLocked ? "Cotización bloqueada. Crea una revisión para agregar costos internos." : "Tu rol no permite editar cotizaciones.");
      return;
    }

    setItems((current) => [...current, quoteItemFromInternalCost(cost)]);
    showSavedMessage(`${cost.name} agregado como costo interno oculto.`);
  }

  function updateItem(id: string, patch: Partial<QuoteItem>) {
    if (!canEditCurrentQuote) {
      showSavedMessage(currentQuoteLocked ? "Cotización bloqueada. Crea una revisión para editar conceptos." : "Tu rol no permite editar cotizaciones.");
      return;
    }

    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    if (!canEditCurrentQuote) {
      showSavedMessage(currentQuoteLocked ? "Cotización bloqueada. Crea una revisión para quitar conceptos." : "Tu rol no permite editar cotizaciones.");
      return;
    }

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
      rules: effectiveRules,
      items,
      totals,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      validUntil: validUntil || getDefaultValidUntil(),
      revisionOf: existing?.revisionOf,
      revisionNumber: existing?.revisionNumber,
      archivedAt: existing?.archivedAt,
      lockedAt: existing?.lockedAt,
    };
  }

  function saveQuote(status: QuoteStatus = quoteStatus) {
    if (!canCreateQuotes && !canEditCurrentQuote) {
      showSavedMessage("Tu rol no permite guardar cotizaciones.");
      return;
    }

    if (currentQuoteLocked) {
      showSavedMessage("Esta cotización ya fue enviada/cerrada. Crea una revisión para hacer cambios.");
      return;
    }

    if ((status === "accepted" || status === "rejected") && !canChangeQuoteStatus) {
      showSavedMessage("Sólo ADMIN o SUPERVISOR pueden aceptar o rechazar cotizaciones.");
      return;
    }

    if (status === "sent" && !roleCan("edit_draft_quotes")) {
      showSavedMessage("Tu rol no permite enviar cotizaciones.");
      return;
    }

    if (items.length === 0) {
      showSavedMessage("Agrega al menos un concepto antes de guardar.");
      return;
    }

    if (isPastDateInputValue(validUntil)) {
      showSavedMessage("La vigencia de la cotización no puede ser una fecha pasada.");
      return;
    }

    if (isPastDateInputValue(client.targetDeliveryDate)) {
      showSavedMessage("La fecha objetivo de entrega no puede ser una fecha pasada.");
      return;
    }

    const quote = {
      ...buildSavedQuote(status),
      lockedAt: status === "draft" ? undefined : (currentQuote?.lockedAt ?? new Date().toISOString()),
    };
    const exists = savedQuotes.some((savedQuote) => savedQuote.id === quote.id);
    const nextQuotes = exists
      ? savedQuotes.map((savedQuote) => (savedQuote.id === quote.id ? quote : savedQuote))
      : [quote, ...savedQuotes];

    persistQuotes(nextQuotes);
    setCurrentQuoteId(quote.id);
    setQuoteStatus(status);
    syncSavedQuoteToDatabase(quote);
    showSavedMessage(`Cotización ${quote.folio} guardada como ${statusLabels[status]}.`);
  }

  function loadQuote(quote: SavedQuote) {
    setClient(quote.client);
    setMode(quote.mode);
    setSourceCodeOption(quote.sourceCodeOption);
    setRules({ ...defaultPricingRules, ...quote.rules });
    setItems(quote.items);
    setQuoteStatus(quote.status);
    setCurrentQuoteId(quote.id);
    setValidUntil(quote.validUntil || getDefaultValidUntil());
    setActiveTab("quote");
    showSavedMessage(`Cotización ${quote.folio} cargada.`);
  }

  function duplicateQuote(quote: SavedQuote) {
    if (!canCreateQuotes) {
      showSavedMessage("Tu rol no permite duplicar cotizaciones.");
      return;
    }

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
      revisionOf: undefined,
      revisionNumber: undefined,
      archivedAt: undefined,
      lockedAt: undefined,
    };

    persistQuotes([duplicatedQuote, ...savedQuotes]);
    loadQuote(duplicatedQuote);
  }

  function createQuoteRevision(quote: SavedQuote) {
    if (!canCreateQuotes || !roleCan("edit_draft_quotes")) {
      showSavedMessage("Tu rol no permite crear revisiones.");
      return;
    }

    const now = new Date().toISOString();
    const revisionItems = cloneQuoteItems(quote.items);
    const revisionTotals = calculateQuoteTotals(
      revisionItems,
      quote.mode,
      quote.sourceCodeOption,
      quote.rules,
    );
    const revisionNumber = getNextRevisionNumber(savedQuotes, quote);

    const revisionQuote: SavedQuote = {
      ...quote,
      id: makeId("quote"),
      folio: getNextRevisionFolio(savedQuotes, quote),
      status: "draft",
      items: revisionItems,
      totals: revisionTotals,
      createdAt: now,
      updatedAt: now,
      validUntil: getDefaultValidUntil(),
      revisionOf: quote.revisionOf ?? quote.id,
      revisionNumber,
      archivedAt: undefined,
      lockedAt: undefined,
    };

    persistQuotes([revisionQuote, ...savedQuotes]);
    loadQuote(revisionQuote);
    showSavedMessage(`Revisión ${revisionQuote.folio} creada como borrador.`);
  }

  function deleteQuote(quoteId: string) {
    const quote = savedQuotes.find((savedQuote) => savedQuote.id === quoteId);
    if (!quote) return;

    if (quote.status !== "draft" && quote.status !== "rejected") {
      showSavedMessage("No se eliminan cotizaciones enviadas o aceptadas. Usa Archivar para ocultarlas del historial.");
      return;
    }

    if (!roleCan("delete_draft_quotes")) {
      showSavedMessage("Tu rol no permite eliminar cotizaciones.");
      return;
    }

    const confirmed = window.confirm(`¿Eliminar ${quote.folio}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    const nextQuotes = savedQuotes.filter((savedQuote) => savedQuote.id !== quoteId);
    persistQuotes(nextQuotes);

    if (currentQuoteId === quoteId) {
      resetQuote();
    }

    showSavedMessage("Cotización eliminada.");
  }

  function archiveQuote(quoteId: string) {
    const quote = savedQuotes.find((savedQuote) => savedQuote.id === quoteId);
    if (!quote) return;

    if (!roleCan("archive_locked_quotes")) {
      showSavedMessage("Tu rol no permite archivar cotizaciones.");
      return;
    }

    const confirmed = window.confirm(`¿Archivar ${quote.folio}? Quedará oculta del historial y reportes locales.`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const nextQuotes = savedQuotes.map((savedQuote) =>
      savedQuote.id === quoteId ? { ...savedQuote, archivedAt: now, updatedAt: now } : savedQuote,
    );

    persistQuotes(nextQuotes);

    if (currentQuoteId === quoteId) {
      resetQuote();
    }

    showSavedMessage("Cotización archivada.");
  }

  function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
    if (!canChangeQuoteStatus) {
      showSavedMessage("Sólo ADMIN o SUPERVISOR pueden cambiar estados desde historial.");
      return;
    }

    const now = new Date().toISOString();
    const nextQuotes = savedQuotes.map((quote) =>
      quote.id === quoteId
        ? { ...quote, status, lockedAt: status === "draft" ? undefined : (quote.lockedAt ?? now), updatedAt: now }
        : quote,
    );

    persistQuotes(nextQuotes);

    if (currentQuoteId === quoteId) {
      setQuoteStatus(status);
    }
  }

  function clearReportFilters() {
    setReportStatus("all");
    setReportMode("all");
    setReportSearch("");
    setReportFromDate("");
    setReportToDate("");
  }

  function exportReportCsv() {
    if (!canExportReports) {
      showSavedMessage("Tu rol no permite exportar reportes.");
      return;
    }

    if (reportQuotes.length === 0) {
      showSavedMessage("No hay cotizaciones para exportar con esos filtros.");
      return;
    }

    const headers = [
      "Folio",
      "Estado",
      "Empresa",
      "Contacto",
      "Proyecto",
      "Modalidad",
      "Pago inicial",
      "Mensualidad",
      "Renovacion anual",
      "Horas estimadas",
      "Vigencia cotizacion",
      "Fecha objetivo entrega",
      "Creada",
      "Actualizada",
    ];

    const rows = reportQuotes.map((quote) => [
      quote.folio,
      statusLabels[quote.status],
      quote.client.company || "",
      quote.client.clientName || "",
      quote.client.projectName || "",
      formatQuoteMode(quote.mode),
      quote.totals.suggestedInitialPayment,
      quote.totals.suggestedMonthlyPayment,
      quote.totals.suggestedAnnualRenewal,
      quote.totals.estimatedHours,
      quote.validUntil || "",
      quote.client.targetDeliveryDate || "",
      getDateInputValue(quote.createdAt),
      getDateInputValue(quote.updatedAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-cotizaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSavedMessage("Reporte CSV descargado.");
  }

  function printWithMode(mode: "quote" | "reports-summary" | "reports-detail") {
    document.body.dataset.printMode = mode;

    const cleanupPrintMode = () => {
      delete document.body.dataset.printMode;
      window.removeEventListener("afterprint", cleanupPrintMode);
    };

    window.addEventListener("afterprint", cleanupPrintMode);

    window.setTimeout(() => {
      window.print();
      window.setTimeout(cleanupPrintMode, 700);
    }, 50);
  }

  function printReportsSummary() {
    printWithMode("reports-summary");
    showSavedMessage("PDF resumen: imprime sólo indicadores y seguimiento. Para filas completas usa CSV.");
  }

  function printReportsDetail() {
    printWithMode("reports-detail");
    showSavedMessage("PDF detalle: puede ocupar varias hojas si hay muchas cotizaciones.");
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
    printWithMode("quote");
  }

  function resetQuote() {
    if (!canCreateQuotes) {
      showSavedMessage("Tu rol no permite crear cotizaciones.");
      return;
    }

    setClient(defaultClient);
    setMode("hybrid");
    setSourceCodeOption("none");
    setItems([]);
    setQuery("");
    setQuoteStatus("draft");
    setCurrentQuoteId(null);
    setValidUntil(getDefaultValidUntil());
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await response.json()) as { ok?: boolean; user?: AuthUser; error?: string };

      if (!response.ok || !data.ok || !data.user) {
        setLoginError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }

      setAuthUser(data.user);
      setCurrentRole(data.user.role);
      setLoginPassword("");
      showSavedMessage(`Sesión iniciada: ${data.user.name}`);
    } catch (error) {
      console.error("No se pudo iniciar sesión.", error);
      setLoginError("No se pudo conectar con el servidor.");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setAuthUser(null);
    setLoginPassword("");
    setLoginError("");
    showSavedMessage("Sesión cerrada.");
  }

  if (authLoading) {
    return (
      <main className="app-shell auth-shell">
        <section className="card login-card">
          <div className="brand login-brand">
            <div className="brand-mark">PW</div>
            <div>
              <h1 className="brand-title">{companyProfile.name}</h1>
              <p className="brand-subtitle">Validando sesión...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="app-shell auth-shell">
        <section className="card login-card">
          <div className="brand login-brand">
            <div className="brand-mark">PW</div>
            <div>
              <h1 className="brand-title">{companyProfile.name}</h1>
              <p className="brand-subtitle">{companyProfile.descriptor} · Acceso interno</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="field">
              <label>Correo</label>
              <input
                autoComplete="email"
                inputMode="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="correo@empresa.com"
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                autoComplete="current-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Contraseña"
              />
            </div>
            {loginError && <div className="form-alert danger">{loginError}</div>}
            <button className="btn primary" type="submit">Entrar</button>
            <p className="login-help">Solicita tus credenciales al administrador del sistema.</p>
          </form>
        </section>
      </main>
    );
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
          <span className="pill">Catálogo: {catalogSource === "database" ? "BD" : "local"}</span>
          <span className="pill">Sprint 1.6</span>
          <span className="pill">Reglas: {rulesSource === "database" ? "BD" : "local"}</span>
          <span className="pill">Historial: {quotesSource === "database" ? "BD" : "local"}</span>
          <span className="pill">Usuario: {authUser.name}</span>
          <span className="pill">Rol: {roleLabels[currentRole]}</span>
        </div>
      </header>

      {savedMessage && <div className="toast-message">{savedMessage}</div>}

      <section className="card security-strip no-print">
        <div>
          <strong>Sesión activa: {authUser.name}</strong>
          <p>{roleDescriptions[currentRole]} El rol viene del backend y la sesión se guarda en cookie segura.</p>
        </div>
        <div className="field role-field">
          <label>{authUser.email}</label>
          <button className="btn ghost" type="button" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </section>

      <nav className="tabs" aria-label="Secciones del cotizador">
        {availableTabs.includes("quote") && (
          <button className={`tab-button ${activeTab === "quote" ? "active" : ""}`} onClick={() => setActiveTab("quote")}>
            Nueva cotización
          </button>
        )}
        {availableTabs.includes("history") && (
          <button className={`tab-button ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            Historial ({sortedSavedQuotes.length})
          </button>
        )}
        {availableTabs.includes("reports") && (
          <button className={`tab-button ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            Reportes
          </button>
        )}
        {availableTabs.includes("preview") && (
          <button className={`tab-button ${activeTab === "preview" ? "active" : ""}`} onClick={() => setActiveTab("preview")}>
            Vista / PDF
          </button>
        )}
        {availableTabs.includes("catalog") && (
          <button className={`tab-button ${activeTab === "catalog" ? "active" : ""}`} onClick={() => setActiveTab("catalog")}>
            Catálogo local
          </button>
        )}
        {availableTabs.includes("users") && (
          <button className="tab-button" onClick={() => window.location.assign("/users")}>
            Usuarios
          </button>
        )}
        {availableTabs.includes("audit") && (
          <button className="tab-button" onClick={() => window.location.assign("/audit")}>
            Bitácora
          </button>
        )}
        {availableTabs.includes("approvals") && (
          <button className="tab-button" onClick={() => window.location.assign("/approvals")}>
            Autorizaciones
          </button>
        )}
      </nav>

      {activeTab === "quote" && (
        <section className="grid two">
          {currentQuoteLocked && (
            <section className="card lock-banner">
              <div>
                <strong>Cotización bloqueada por regla de negocio</strong>
                <p>{currentQuote?.folio} está como {currentQuote ? statusLabels[currentQuote.status] : "Bloqueada"}. No se edita directo para no alterar lo enviado al cliente. Crea una revisión R2/R3 para cambiar alcance, precio o fechas.</p>
              </div>
              <button className="btn primary" onClick={() => currentQuote && createQuoteRevision(currentQuote)}>Crear revisión</button>
            </section>
          )}
          {!canCreateQuotes && (
            <section className="card lock-banner warning">
              <div>
                <strong>Vista sin permisos de edición</strong>
                <p>Tu rol actual puede consultar, pero no crear o modificar cotizaciones.</p>
              </div>
            </section>
          )}
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
                  <input disabled={!canEditCurrentQuote} value={client.clientName} onChange={(event) => setClient({ ...client, clientName: event.target.value })} placeholder="Ej. Dr. Hernández" />
                </div>
                <div className="field">
                  <label>Empresa / negocio</label>
                  <input disabled={!canEditCurrentQuote} value={client.company} onChange={(event) => setClient({ ...client, company: event.target.value })} placeholder="Ej. Clínica Dental Sonrisas" />
                </div>
                <div className="field">
                  <label>WhatsApp / teléfono</label>
                  <input disabled={!canEditCurrentQuote} value={client.phone} onChange={(event) => setClient({ ...client, phone: event.target.value })} placeholder="656 ..." />
                </div>
                <div className="field">
                  <label>Correo</label>
                  <input disabled={!canEditCurrentQuote} value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} placeholder="cliente@empresa.com" />
                </div>
                <div className="field">
                  <label>Vigencia</label>
                  <div className="date-input-row">
                    <input
                      id="quote-valid-until"
                      disabled={!canEditCurrentQuote}
                      type="date"
                      min={getTodayInputValue()}
                      value={validUntil}
                      onChange={(event) => setValidUntil(event.target.value)}
                    />
                    <button
                      className="btn ghost date-picker-button"
                      disabled={!canEditCurrentQuote}
                      type="button"
                      onClick={() => openDatePicker("quote-valid-until")}
                    >
                      Calendario
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select disabled={!canChangeQuoteStatus} value={quoteStatus} onChange={(event) => setQuoteStatus(event.target.value as QuoteStatus)}>
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviada</option>
                    <option value="accepted">Aceptada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>
                <div className="field full">
                  <label>Nombre del proyecto</label>
                  <input disabled={!canEditCurrentQuote} value={client.projectName} onChange={(event) => setClient({ ...client, projectName: event.target.value })} placeholder="Ej. Sistema de control de pacientes y visitas" />
                </div>
                <div className="field">
                  <label>Fecha objetivo de entrega</label>
                  <div className="date-input-row">
                    <input
                      id="quote-target-delivery-date"
                      disabled={!canEditCurrentQuote}
                      type="date"
                      min={getTodayInputValue()}
                      value={client.targetDeliveryDate ?? ""}
                      onChange={(event) => setClient({ ...client, targetDeliveryDate: event.target.value })}
                    />
                    <button
                      className="btn ghost date-picker-button"
                      disabled={!canEditCurrentQuote}
                      type="button"
                      onClick={() => openDatePicker("quote-target-delivery-date")}
                    >
                      Calendario
                    </button>
                  </div>
                </div>
                <div className="field full">
                  <label>Notas del levantamiento</label>
                  <textarea disabled={!canEditCurrentQuote} value={client.notes} onChange={(event) => setClient({ ...client, notes: event.target.value })} placeholder="Qué pidió el cliente, riesgos, dudas, cosas pendientes..." />
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
                  <select disabled={!canEditCurrentQuote} value={mode} onChange={(event) => setMode(event.target.value as QuoteMode)}>
                    <option value="one_time">Venta única</option>
                    <option value="rental">Renta mensual</option>
                    <option value="hybrid">Híbrido</option>
                  </select>
                </div>
                <div className="field">
                  <label>Eficiencia por desarrollo asistido (%)</label>
                  <input
                    disabled={!canEditCurrentQuote}
                    type="number"
                    min="0"
                    max="40"
                    value={rules.aiEfficiencyPercent ?? 0}
                    onChange={(event) => setRules({ ...rules, aiEfficiencyPercent: Math.max(0, Math.min(40, safeNumber(event.target.value))) })}
                  />
                </div>
                <div className="field">
                  <label>Código fuente</label>
                  <select
                    value={mode === "rental" ? "none" : sourceCodeOption}
                    disabled={!canEditCurrentQuote || mode === "rental"}
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
                  disabled={!canEditCurrentQuote}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setManualDraft((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="Ej. WhatsApp, pacientes, reportes, app móvil..."
                />

                <div className="compact-table-wrap">
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Concepto / módulo</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Precio</th>
                        <th>Horas</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map((service) => (
                        <tr key={service.id}>
                          <td>
                            <strong>{service.name}</strong>
                            <small>{service.descriptionClient}</small>
                          </td>
                          <td>{categoryLabels[service.category]}</td>
                          <td>{formatBillingType(service.billingType)}</td>
                          <td>{formatCurrency(service.basePrice)}</td>
                          <td>{service.estimatedHours} h</td>
                          <td>
                            <button className="btn primary small" disabled={!canEditCurrentQuote} onClick={() => addService(service)}>Agregar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                        <input disabled={!canEditCurrentQuote} value={manualDraft.name} onChange={(event) => setManualDraft({ ...manualDraft, name: event.target.value })} />
                      </div>
                      <div className="field">
                        <label>Categoría</label>
                        <select disabled={!canEditCurrentQuote} value={manualDraft.category} onChange={(event) => setManualDraft({ ...manualDraft, category: event.target.value as ServiceCategory })}>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Tipo de cobro</label>
                        <select disabled={!canEditCurrentQuote} value={manualDraft.billingType} onChange={(event) => setManualDraft({ ...manualDraft, billingType: event.target.value as BillingType })}>
                          <option value="one_time">Único</option>
                          <option value="monthly">Mensual</option>
                          <option value="annual">Anual</option>
                          <option value="hourly">Por hora</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Precio</label>
                        <input disabled={!canEditCurrentQuote} type="number" min="0" value={manualDraft.basePrice} onChange={(event) => setManualDraft({ ...manualDraft, basePrice: safeNumber(event.target.value) })} />
                      </div>
                      <div className="field">
                        <label>Horas estimadas</label>
                        <input disabled={!canEditCurrentQuote} type="number" min="0" value={manualDraft.estimatedHours} onChange={(event) => setManualDraft({ ...manualDraft, estimatedHours: safeNumber(event.target.value, 1) })} />
                      </div>
                      <div className="field">
                        <label>Guardar en catálogo</label>
                        <select disabled={!canEditCurrentQuote} value={saveManualToCatalog ? "yes" : "no"} onChange={(event) => setSaveManualToCatalog(event.target.value === "yes")}>
                          <option value="yes">Sí, usar en futuras cotizaciones</option>
                          <option value="no">No, sólo esta cotización</option>
                        </select>
                      </div>
                      <div className="field full">
                        <label>Descripción para cliente</label>
                        <textarea disabled={!canEditCurrentQuote} value={manualDraft.descriptionClient} onChange={(event) => setManualDraft({ ...manualDraft, descriptionClient: event.target.value })} />
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <button className="btn success" disabled={!canEditCurrentQuote || !manualDraft.name.trim() || manualDraft.basePrice <= 0} onClick={createManualConcept}>
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
                  <h2>Costos internos / gastos ocultos</h2>
                  <p>Captura hosting, dominio, servidor, hostname, APIs, licencias o herramientas. Suman al precio, pero no se listan al cliente.</p>
                </div>
              </div>

              <div className="form-grid internal-cost-form">
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
                  <label>Cant.</label>
                  <input disabled={!canEditCurrentQuote} type="number" min="1" value={internalCostQuantity} onChange={(event) => setInternalCostQuantity(Math.max(1, safeNumber(event.target.value, 1)))} />
                </div>
                <div className="field">
                  <label>Importe unitario</label>
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
                <button className="btn success" disabled={!canEditCurrentQuote || !internalCostDraft.name.trim() || internalCostDraft.basePrice < 0} onClick={addInternalCost}>Agregar costo interno</button>
                <button className="btn ghost" disabled={!canEditCurrentQuote} onClick={() => { setInternalCostDraft(defaultInternalCostDraft()); setInternalCostQuantity(1); }}>Limpiar</button>
              </div>

              <div className="internal-catalog">
                <div className="field">
                  <label>Catálogo rápido de costos internos</label>
                  <input disabled={!canEditCurrentQuote} value={internalCostSearch} onChange={(event) => setInternalCostSearch(event.target.value)} placeholder="Buscar hosting, dominio, servidor, API WhatsApp, Maps API, licencia..." />
                </div>
                <div className="compact-table-wrap">
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Costo interno</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Importe</th>
                        <th>Horas</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInternalCostCatalog.map((cost) => (
                        <tr key={cost.id}>
                          <td>
                            <strong>{cost.name}</strong>
                            <small>{cost.descriptionInternal}</small>
                          </td>
                          <td>{categoryLabels[cost.category]}</td>
                          <td>{formatBillingType(cost.billingType)}</td>
                          <td>{formatCurrency(cost.basePrice)}</td>
                          <td>{cost.estimatedHours} h</td>
                          <td>
                            <button className="btn ghost small" disabled={!canEditCurrentQuote} type="button" onClick={() => addInternalCatalogCost(cost)}>
                              Agregar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="internal-cost-summary">
                <div><span>Oculto único</span><strong>{formatCurrency(internalCostOneTimeSubtotal)}</strong></div>
                <div><span>Oculto mensual</span><strong>{formatCurrency(internalCostMonthlySubtotal)}</strong></div>
                <div><span>Oculto anual</span><strong>{formatCurrency(internalCostAnnualSubtotal)}</strong></div>
                <div><span>Total oculto</span><strong>{formatCurrency(internalCostSubtotal)}</strong></div>
              </div>

              {internalQuoteItems.length > 0 && (
                <div className="internal-cost-table-wrap">
                  <table className="internal-cost-table">
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Cant.</th>
                        <th>Importe unitario</th>
                        <th>Total</th>
                        <th>Horas</th>
                        <th>Visible al cliente</th>
                        <th>Nota interna</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {internalQuoteItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input disabled={!canEditCurrentQuote} value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} />
                          </td>
                          <td>{categoryLabels[item.category]}</td>
                          <td>{formatBillingType(item.billingType)}</td>
                          <td>
                            <input disabled={!canEditCurrentQuote} type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(1, safeNumber(event.target.value, 1)) })} />
                          </td>
                          <td>
                            <input disabled={!canEditCurrentQuote} type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Math.max(0, safeNumber(event.target.value)) })} />
                          </td>
                          <td><strong>{formatCurrency(item.unitPrice * item.quantity)}</strong></td>
                          <td>
                            <input disabled={!canEditCurrentQuote} type="number" min="0" value={item.estimatedHours} onChange={(event) => updateItem(item.id, { estimatedHours: Math.max(0, safeNumber(event.target.value)) })} />
                          </td>
                          <td>
                            <input checked={item.visibleToClient !== false} disabled={!canEditCurrentQuote} type="checkbox" onChange={(event) => updateItem(item.id, { visibleToClient: event.target.checked })} />
                          </td>
                          <td>
                            <input disabled={!canEditCurrentQuote} value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} />
                          </td>
                          <td>
                            <button className="btn danger small" disabled={!canEditCurrentQuote} onClick={() => removeItem(item.id)}>Quitar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Conceptos visibles al cliente</h2>
                  <p>Estos conceptos sí aparecen en PDF / WhatsApp. Los gastos internos se administran en su propio panel.</p>
                </div>
              </div>

              {visibleQuoteItems.length === 0 ? (
                <div className="notice">Todavía no hay conceptos visibles al cliente. Busca un servicio o crea uno nuevo desde el buscador.</div>
              ) : (
                <div className="compact-table-wrap">
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th>Tipo</th>
                        <th>Cant.</th>
                        <th>Precio unitario</th>
                        <th>Total</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleQuoteItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                            <small>
                              {categoryLabels[item.category]} · {item.source === "manual" ? "Manual" : "Catálogo"}
                              {item.requiresApproval ? " · Revisión interna" : ""}
                            </small>
                          </td>
                          <td>{formatBillingType(item.billingType)}</td>
                          <td>
                            <input disabled={!canEditCurrentQuote} type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(1, safeNumber(event.target.value, 1)) })} />
                          </td>
                          <td>
                            <input disabled={!canEditCurrentQuote} type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Math.max(0, safeNumber(event.target.value)) })} />
                          </td>
                          <td><strong>{formatCurrency(item.unitPrice * item.quantity)}</strong></td>
                          <td>
                            <div className="compact-actions">
                              <button className="btn ghost small" disabled={!canEditCurrentQuote} onClick={() => updateItem(item.id, { visibleToClient: false })}>Interno</button>
                              <button className="btn danger small" disabled={!canEditCurrentQuote} onClick={() => removeItem(item.id)}>Quitar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <strong>{formatCurrency(totals.riskCharge + totals.urgencyCharge + totals.commissionCharge - totals.discountAmount - totals.aiEfficiencyAdjustment + totals.sourceCodeCharge)}</strong>
                </div>
                <div className="service-row">
                  <div>
                    <h4>Horas estimadas</h4>
                    <p>Referencia interna para validar que no se esté regalando trabajo.</p>
                  </div>
                  <strong>{totals.estimatedHours} h</strong>
                </div>
                <div className="service-row">
                  <div>
                    <h4>Costos internos/no visibles</h4>
                    <p>Único {formatCurrency(internalCostOneTimeSubtotal)} · Mensual {formatCurrency(internalCostMonthlySubtotal)} · Anual {formatCurrency(internalCostAnnualSubtotal)}</p>
                  </div>
                  <strong>{formatCurrency(internalCostSubtotal)}</strong>
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
                  <button className="btn ghost" disabled={!canEditCurrentQuote} onClick={() => saveQuote("draft")}>Guardar borrador</button>
                  <button className="btn primary" disabled={!canEditCurrentQuote} onClick={() => saveQuote("sent")}>Guardar como enviada</button>
                  <button className="btn success" disabled={!canEditCurrentQuote || !canChangeQuoteStatus} onClick={() => saveQuote("accepted")}>Marcar aceptada</button>
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
              <strong className="kpi-value">{sortedSavedQuotes.length}</strong>
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
                <p>{quotesSource === "database" ? "Sincronizado desde PostgreSQL con respaldo local." : "Guardado local en este navegador."}</p>
              </div>
              <button className="btn ghost" disabled={!canCreateQuotes} onClick={resetQuote}>Nueva cotización</button>
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
                      <select disabled={!canChangeQuoteStatus} value={quote.status} onChange={(event) => updateQuoteStatus(quote.id, event.target.value as QuoteStatus)}>
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviada</option>
                        <option value="accepted">Aceptada</option>
                        <option value="rejected">Rechazada</option>
                      </select>
                      <button className="btn primary" onClick={() => loadQuote(quote)}>Abrir</button>
                      <button className="btn ghost" disabled={!canCreateQuotes} onClick={() => duplicateQuote(quote)}>Duplicar</button>
                      {quote.status !== "draft" && <button className="btn primary" disabled={!canCreateQuotes} onClick={() => createQuoteRevision(quote)}>Crear revisión</button>}
                      {(quote.status === "draft" || quote.status === "rejected") ? (
                        <button className="btn danger" disabled={!roleCan("delete_draft_quotes")} onClick={() => deleteQuote(quote.id)}>Eliminar</button>
                      ) : (
                        <button className="btn danger" disabled={!roleCan("archive_locked_quotes")} onClick={() => archiveQuote(quote.id)}>Archivar</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      )}

      {activeTab === "reports" && (
        <section className="grid reports-page">
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Reportes locales</h2>
                <p>Información útil para seguimiento: dinero aceptado, trabajo pendiente, vencimientos y cotizaciones por cerrar.</p>
              </div>
              <div className="quote-actions no-print">
                <button className="btn ghost" onClick={clearReportFilters}>Limpiar filtros</button>
                <button className="btn success" disabled={!canExportReports} onClick={exportReportCsv}>Exportar datos CSV</button>
                <button className="btn print" onClick={printReportsSummary}>PDF resumen</button>
                <button className="btn ghost" onClick={printReportsDetail}>PDF detalle</button>
              </div>
            </div>

            <div className="notice info no-print report-export-help">
              <strong>Cómo se exporta:</strong> PDF resumen imprime indicadores y seguimiento para revisión rápida. PDF detalle imprime también las tablas de cotizaciones y puede salir en varias hojas. CSV exporta datos crudos para Excel, por eso trae columnas distintas al PDF. Para mandar una propuesta a cliente usa la pestaña <strong>Vista / PDF</strong> de la cotización.
            </div>

            <div className="report-filters no-print">
              <div className="field">
                <label>Buscar en folio, cliente, proyecto, correo, teléfono, estado o modalidad</label>
                <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Ej. PW-000003, clínica, enviada, híbrido..." />
              </div>
              <div className="field">
                <label>Estado</label>
                <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value as QuoteStatus | "all")}>
                  <option value="all">Todos</option>
                  <option value="draft">Borrador</option>
                  <option value="sent">Enviada</option>
                  <option value="accepted">Aceptada</option>
                  <option value="rejected">Rechazada</option>
                </select>
              </div>
              <div className="field">
                <label>Modalidad</label>
                <select value={reportMode} onChange={(event) => setReportMode(event.target.value as QuoteMode | "all")}>
                  <option value="all">Todas</option>
                  <option value="one_time">Venta única</option>
                  <option value="rental">Renta mensual</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </div>
              <div className="field">
                <label>Actualizadas desde</label>
                <input type="date" value={reportFromDate} onChange={(event) => setReportFromDate(event.target.value)} />
              </div>
              <div className="field">
                <label>Actualizadas hasta</label>
                <input type="date" value={reportToDate} onChange={(event) => setReportToDate(event.target.value)} />
              </div>
            </div>

            <div className="filter-status-panel">
              <div>
                <strong>Mostrando {reportQuotes.length} de {savedQuotes.length} cotizaciones</strong>
                <p>
                  {reportFilterLabels.length > 0
                    ? "Filtros aplicados. Los números de abajo ya están recalculados con esos filtros."
                    : "Sin filtros aplicados. Estás viendo el total local guardado en este navegador."}
                </p>
              </div>
              <div className="filter-chip-row">
                {reportFilterLabels.length === 0 ? (
                  <span className="filter-chip">Sin filtros</span>
                ) : (
                  reportFilterLabels.map((filter) => <span className="filter-chip" key={filter}>{filter}</span>)
                )}
              </div>
              <small>La búsqueda revisa: folio, empresa, contacto, proyecto, correo, teléfono, fecha objetivo, estado y modalidad.</small>
            </div>

            <div className="print-only report-print-note">
              <strong>Reporte operativo de cotizaciones</strong> · Generado desde datos locales del navegador.
              {reportFilterLabels.length > 0 ? ` Filtros aplicados: ${reportFilterLabels.join(" · ")}.` : " Sin filtros aplicados."}
            </div>
          </section>

          <section className="kpi-row reports-kpis useful-kpis">
            <article className="card soft">
              <div className="kpi-label">Pago inicial aceptado</div>
              <strong className="kpi-value">{formatCurrency(reportTotals.acceptedInitial)}</strong>
              <small className="kpi-helper">Dinero generado por cotizaciones aceptadas.</small>
            </article>
            <article className="card soft">
              <div className="kpi-label">Mensualidad aceptada</div>
              <strong className="kpi-value">{formatCurrency(reportTotals.acceptedMonthly)}</strong>
              <small className="kpi-helper">Ingreso mensual comprometido.</small>
            </article>
            <article className="card soft">
              <div className="kpi-label">Renovación anual aceptada</div>
              <strong className="kpi-value">{formatCurrency(reportTotals.acceptedAnnual)}</strong>
              <small className="kpi-helper">Ingreso anual comprometido.</small>
            </article>
            <article className="card soft">
              <div className="kpi-label">Trabajo aceptado</div>
              <strong className="kpi-value">{reportTotals.acceptedHours} h</strong>
              <small className="kpi-helper">Horas estimadas de proyectos aceptados.</small>
            </article>
            <article className="card soft">
              <div className="kpi-label">Propuestas por cerrar</div>
              <strong className="kpi-value">{reportTotals.sent}</strong>
              <small className="kpi-helper">Enviadas: {formatCurrency(reportTotals.sentInitial)} inicial.</small>
            </article>
            <article className="card soft">
              <div className="kpi-label">Vencen en 7 días</div>
              <strong className="kpi-value">{reportBusinessSummary.quotesDueSoon}</strong>
              <small className="kpi-helper">Borradores/enviadas que necesitan seguimiento.</small>
            </article>
            <article className="card soft">
              <div className="kpi-label">Por entregar esta semana</div>
              <strong className="kpi-value">{reportBusinessSummary.deliveryThisWeek}</strong>
              <small className="kpi-helper">{reportBusinessSummary.deliveryThisWeekHours} h estimadas.</small>
            </article>
            <article className="card soft">
              <div className="kpi-label">Por entregar este mes</div>
              <strong className="kpi-value">{reportBusinessSummary.deliveryThisMonth}</strong>
              <small className="kpi-helper">{reportBusinessSummary.deliveryThisMonthHours} h estimadas.</small>
            </article>
          </section>

          <section className="grid two">
            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Dinero por estado</h2>
                  <p>Sirve para ver qué ya generó dinero, qué está por cerrar y qué sigue en borrador.</p>
                </div>
              </div>

              <div className="status-report-grid">
                {(Object.keys(statusLabels) as QuoteStatus[]).map((status) => (
                  <article className="status-report-card" key={status}>
                    <div className="history-heading">
                      <h4>{statusLabels[status]}</h4>
                      <span className={`status-badge ${status}`}>{reportStatusSummary[status].count}</span>
                    </div>
                    <p>Inicial: <strong>{formatCurrency(reportStatusSummary[status].initial)}</strong></p>
                    <p>Mensual: <strong>{formatCurrency(reportStatusSummary[status].monthly)}</strong></p>
                    <p>Renovación anual: <strong>{formatCurrency(reportStatusSummary[status].annual)}</strong></p>
                    <p>Horas: <strong>{reportStatusSummary[status].hours} h</strong></p>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Seguimiento recomendado</h2>
                  <p>No repite el estado; te dice qué acciones conviene revisar.</p>
                </div>
              </div>
              <div className="action-list">
                <div><span>Enviar / cerrar propuestas enviadas</span><strong>{reportTotals.sent}</strong><small>{formatCurrency(reportTotals.sentInitial)} por cobrar si aceptan.</small></div>
                <div><span>Completar borradores</span><strong>{reportTotals.draft}</strong><small>{formatCurrency(reportTotals.draftInitial)} todavía sin enviar.</small></div>
                <div><span>Cotizaciones vencidas</span><strong>{reportBusinessSummary.expiredQuotes}</strong><small>Necesitan renovación de vigencia o descarte.</small></div>
                <div><span>Entregas atrasadas</span><strong>{reportBusinessSummary.overdueDelivery}</strong><small>Usa la fecha objetivo de entrega capturada en la cotización.</small></div>
                <div><span>Aceptadas sin fecha de entrega</span><strong>{reportBusinessSummary.acceptedWithoutDeliveryDate}</strong><small>Agrega fecha objetivo para poder planear semana/mes.</small></div>
              </div>
              <div className="notice info">
                Para fechas de entrega reales, captura <strong>Fecha objetivo de entrega</strong> en la cotización. La vigencia es sólo la fecha límite comercial de la propuesta.
              </div>
            </section>
          </section>

          <section className="card report-detail-section">
            <div className="card-title">
              <div>
                <h2>Proyectos por entregar</h2>
                <p>Cotizaciones aceptadas ordenadas por fecha objetivo de entrega.</p>
              </div>
            </div>

            {deliveryReportQuotes.length === 0 ? (
              <div className="notice">No hay cotizaciones aceptadas con los filtros actuales. Para planear entregas, marca cotizaciones como aceptadas y captura fecha objetivo.</div>
            ) : (
              <div className="report-table delivery-table">
                <div className="report-table-head delivery">
                  <span>Folio</span>
                  <span>Cliente / proyecto</span>
                  <span>Entrega</span>
                  <span>Tiempo</span>
                  <span>Horas</span>
                  <span>Inicial</span>
                  <span>Acción</span>
                </div>
                {deliveryReportQuotes.map((quote) => {
                  const days = getDaysUntil(quote.client.targetDeliveryDate);
                  return (
                    <article className="report-table-row delivery" key={quote.id}>
                      <strong>{quote.folio}</strong>
                      <div>
                        <strong>{quote.client.company || quote.client.clientName || "Cliente pendiente"}</strong>
                        <small>{quote.client.projectName || "Proyecto pendiente"}</small>
                      </div>
                      <span>{quote.client.targetDeliveryDate ? formatDate(quote.client.targetDeliveryDate) : "Sin fecha"}</span>
                      <strong>{formatDayDistance(days)}</strong>
                      <strong>{quote.totals.estimatedHours} h</strong>
                      <strong>{formatCurrency(quote.totals.suggestedInitialPayment)}</strong>
                      <button className="btn primary small" onClick={() => loadQuote(quote)}>Abrir</button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card report-detail-section">
            <div className="card-title">
              <div>
                <h2>Vencimiento de cotizaciones</h2>
                <p>Sirve para saber cuáles propuestas necesitan seguimiento antes de que expire la vigencia.</p>
              </div>
            </div>

            {expirationReportQuotes.length === 0 ? (
              <div className="notice">No hay vencimientos que coincidan con los filtros.</div>
            ) : (
              <div className="report-table due-table">
                <div className="report-table-head due">
                  <span>Folio</span>
                  <span>Cliente / proyecto</span>
                  <span>Estado</span>
                  <span>Vigencia</span>
                  <span>Tiempo</span>
                  <span>Inicial</span>
                  <span>Acción</span>
                </div>
                {expirationReportQuotes.map((quote) => {
                  const days = getDaysUntil(quote.validUntil);
                  return (
                    <article className="report-table-row due" key={quote.id}>
                      <strong>{quote.folio}</strong>
                      <div>
                        <strong>{quote.client.company || quote.client.clientName || "Cliente pendiente"}</strong>
                        <small>{quote.client.projectName || "Proyecto pendiente"}</small>
                      </div>
                      <span className={`status-badge ${quote.status}`}>{statusLabels[quote.status]}</span>
                      <span>{quote.validUntil ? formatDate(quote.validUntil) : "Sin vigencia"}</span>
                      <strong>{formatDayDistance(days)}</strong>
                      <strong>{formatCurrency(quote.totals.suggestedInitialPayment)}</strong>
                      <button className="btn primary small" onClick={() => loadQuote(quote)}>Abrir</button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card report-detail-section">
            <div className="card-title">
              <div>
                <h2>Cotizaciones con dinero por cerrar</h2>
                <p>Borradores y enviadas ordenadas por pago inicial sugerido.</p>
              </div>
            </div>

            {topReportQuotes.length === 0 ? (
              <div className="notice">No hay cotizaciones abiertas que coincidan con los filtros.</div>
            ) : (
              <div className="report-table opportunity-table">
                <div className="report-table-head opportunity">
                  <span>Folio</span>
                  <span>Cliente / proyecto</span>
                  <span>Estado</span>
                  <span>Inicial</span>
                  <span>Mensual</span>
                  <span>Acción</span>
                </div>
                {topReportQuotes.map((quote) => (
                  <article className="report-table-row opportunity" key={quote.id}>
                    <strong>{quote.folio}</strong>
                    <div>
                      <strong>{quote.client.company || quote.client.clientName || "Cliente pendiente"}</strong>
                      <small>{quote.client.projectName || "Proyecto pendiente"}</small>
                    </div>
                    <span className={`status-badge ${quote.status}`}>{statusLabels[quote.status]}</span>
                    <strong>{formatCurrency(quote.totals.suggestedInitialPayment)}</strong>
                    <strong>{formatCurrency(quote.totals.suggestedMonthlyPayment)}</strong>
                    <button className="btn primary small" onClick={() => loadQuote(quote)}>Abrir</button>
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
                <button className="btn primary" disabled={!canEditCurrentQuote} onClick={() => saveQuote("draft")}>Guardar borrador</button>
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
                <p><strong>Fecha objetivo de entrega:</strong> {client.targetDeliveryDate ? formatDate(client.targetDeliveryDate) : "Pendiente de definir"}</p>
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
              {visibleQuoteItems.length === 0 ? (
                <p className="print-empty">No hay conceptos visibles para cliente todavía.</p>
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
                    {visibleQuoteItems.map((item) => (
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
        <section className="grid catalog-page">
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

            {filteredCatalogServices.length === 0 ? (
              <div className="notice">No hay servicios con esos filtros.</div>
            ) : (
              <div className="compact-table-wrap">
                <table className="compact-table catalog-table">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Tipo</th>
                      <th>Precio</th>
                      <th>Horas</th>
                      <th>Estado</th>
                      <th>Origen</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalogServices.map((service) => {
                      const isBaseService = baseCatalogServices.some((baseService) => baseService.id === service.id);
                      const hasOverride = Boolean(serviceOverrides[service.id]);
                      const isCustomService = customServices.some((customService) => customService.id === service.id);

                      return (
                        <tr className={service.active ? "" : "inactive-row"} key={service.id}>
                          <td>
                            <strong>{service.name}</strong>
                          </td>
                          <td className="description-cell">{service.descriptionClient}</td>
                          <td>{categoryLabels[service.category]}</td>
                          <td>{formatBillingType(service.billingType)}</td>
                          <td>{formatCurrency(service.basePrice)}</td>
                          <td>{service.estimatedHours} h</td>
                          <td>{service.active ? "Activo" : "Inactivo"}</td>
                          <td>{isBaseService ? (hasOverride ? "Base ajustado" : "Base") : "Personalizado"}</td>
                          <td>
                            <div className="compact-actions">
                              <button className="btn primary small" onClick={() => addService(service)} disabled={!service.active}>Cotizar</button>
                              <button className="btn ghost small" onClick={() => startEditCatalogService(service)}>Editar</button>
                              <button className="btn warning small" onClick={() => toggleCatalogService(service)}>{service.active ? "Desactivar" : "Activar"}</button>
                              {isBaseService && <button className="btn ghost small" onClick={() => cloneServiceToCatalog(service)}>Copiar</button>}
                              {isBaseService && hasOverride && <button className="btn danger small" onClick={() => resetBaseCatalogService(service.id)}>Restaurar</button>}
                              {isCustomService && <button className="btn danger small" onClick={() => deleteCustomCatalogService(service.id)}>Eliminar</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      )}

      {activeTab === "quote" && (
        <section className="mobile-total-bar no-print" aria-label="Resumen rápido móvil">
          <div className="mobile-total-main">
            <span>Total inicial</span>
            <strong>{formatCurrency(totals.suggestedInitialPayment)}</strong>
          </div>
          <div className="mobile-total-secondary">
            <span>Mensual</span>
            <strong>{formatCurrency(totals.suggestedMonthlyPayment)}</strong>
          </div>
          <button className="btn primary" onClick={openPrintPreview}>
            Ver PDF
          </button>
        </section>
      )}

      <p className="footer-note">
        {companyProfile.name} · Sprint 1.4 · Reportes locales · Sin datos sensibles · Base limpia para GitHub.
      </p>
    </main>
  );
}
