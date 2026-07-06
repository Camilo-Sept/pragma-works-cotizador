import fs from "node:fs";

const filePath = "components/CotizadorApp.tsx";
const selfPath = "scripts/apply-approval-gates.mjs";
const oldHelperPath = "scripts/integrate-discount-approval.mjs";
let source = fs.readFileSync(filePath, "utf8");

if (source.includes("type ApprovalRequirement")) {
  console.log("El semáforo general de autorizaciones ya existe. No se aplicaron cambios.");
  fs.rmSync(oldHelperPath, { force: true });
  fs.rmSync(selfPath, { force: true });
  process.exit(0);
}

if (source.includes("requestDiscountApproval")) {
  throw new Error("Se detectó la integración parcial anterior de descuento. No continúes: pega este error para limpiarla antes de aplicar el semáforo general.");
}

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`No se encontró bloque esperado: ${label}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  "approval types",
  `type PermissionKey =
  | "create_quote"
  | "edit_draft_quotes"
  | "change_quote_status"
  | "delete_draft_quotes"
  | "archive_locked_quotes"
  | "view_reports"
  | "edit_catalog"
  | "edit_pricing_rules"
  | "export_data"
  | "view_github";`,
  `type PermissionKey =
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

type ApprovalTypeKey =
  | "discount_over_10"
  | "quote_item_price_change"
  | "manual_priced_item"
  | "catalog_price_change"
  | "pricing_rule_change";

type ApprovalStatusKey = "pending" | "approved" | "rejected" | "cancelled";

type ApprovalTracker = {
  id: string;
  type: ApprovalTypeKey;
  status: ApprovalStatusKey;
  reason: string | null;
  resolutionNotes: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  requestedAt: string;
  resolvedAt: string | null;
};

type ApprovalRequirement = {
  key: string;
  type: ApprovalTypeKey;
  title: string;
  description: string;
  entityLabel: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  metadata: Record<string, unknown>;
};`,
);

replaceOnce(
  "approval labels",
  `const statusLabels: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
};`,
  `const statusLabels: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

const approvalTypeLabels: Record<ApprovalTypeKey, string> = {
  discount_over_10: "Descuento mayor a 10%",
  quote_item_price_change: "Cambio de precio en partida",
  manual_priced_item: "Concepto manual con precio",
  catalog_price_change: "Cambio de precio de catálogo",
  pricing_rule_change: "Cambio de reglas comerciales",
};

const approvalStatusLabels: Record<ApprovalStatusKey | "not_requested", string> = {
  not_requested: "No solicitada",
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};`,
);

replaceOnce(
  "approval helpers",
  `function getNextRevisionFolio(quotes: SavedQuote[], quote: SavedQuote) {
  const nextRevision = getNextRevisionNumber(quotes, quote);
  return `${getBaseFolio(quote.folio)}-R${nextRevision}`;
}`,
  `function getNextRevisionFolio(quotes: SavedQuote[], quote: SavedQuote) {
  const nextRevision = getNextRevisionNumber(quotes, quote);
  return `${getBaseFolio(quote.folio)}-R${nextRevision}`;
}

function getApprovalMetadata(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getApprovalKey(approval: ApprovalTracker) {
  const metadata = getApprovalMetadata(approval.metadata);
  return typeof metadata.approvalKey === "string" ? metadata.approvalKey : "";
}

function getApprovalBadgeClass(status: ApprovalStatusKey | "not_requested") {
  if (status === "approved") return "accepted";
  if (status === "rejected" || status === "cancelled") return "rejected";
  if (status === "pending") return "sent";
  return "draft";
}

function buildApprovalKey(parts: Array<string | number | null | undefined>) {
  return parts.map((part) => String(part ?? "none").trim()).join("::");
}`,
);

replaceOnce(
  "approval state",
  `  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");`,
  `  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [approvalRequests, setApprovalRequests] = useState<ApprovalTracker[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalSavingKey, setApprovalSavingKey] = useState("");`,
);

replaceOnce(
  "approval load effect",
  `  useEffect(() => {
    window.localStorage.setItem(SERVICE_OVERRIDES_KEY, JSON.stringify(serviceOverrides));
  }, [serviceOverrides]);`,
  `  useEffect(() => {
    window.localStorage.setItem(SERVICE_OVERRIDES_KEY, JSON.stringify(serviceOverrides));
  }, [serviceOverrides]);

  useEffect(() => {
    void loadApprovalsForQuote(currentQuoteId);
  }, [currentQuoteId]);`,
);

replaceOnce(
  "approval computed state",
  `  const canEditCatalog = roleCan("edit_catalog");
  const canEditPricingRules = roleCan("edit_pricing_rules");`,
  `  const canEditCatalog = roleCan("edit_catalog");
  const canEditPricingRules = roleCan("edit_pricing_rules");

  const approvalRequirements = useMemo<ApprovalRequirement[]>(() => {
    const quoteReference = currentQuoteId ?? "draft";
    const requirements: ApprovalRequirement[] = [];
    const serviceById = new Map(catalogServices.map((service) => [service.id, service]));

    if (rules.discountPercent > 10) {
      requirements.push({
        key: buildApprovalKey([quoteReference, "discount_over_10", rules.discountPercent, totals.discountAmount, totals.suggestedInitialPayment]),
        type: "discount_over_10",
        title: approvalTypeLabels.discount_over_10,
        description: `Descuento comercial configurado en ${rules.discountPercent}%.`,
        entityLabel: currentQuote?.folio ?? client.projectName || client.company || "Cotización nueva",
        reason: `Descuento comercial de ${rules.discountPercent}% requiere autorización antes de enviar o cerrar la cotización.`,
        before: { maxAllowedWithoutApproval: 10 },
        after: {
          discountPercent: rules.discountPercent,
          discountAmount: totals.discountAmount,
          suggestedInitialPayment: totals.suggestedInitialPayment,
          suggestedMonthlyPayment: totals.suggestedMonthlyPayment,
        },
        metadata: {
          folio: currentQuote?.folio ?? null,
          localQuoteId: currentQuoteId,
          company: client.company || null,
          clientName: client.clientName || null,
          projectName: client.projectName || null,
        },
      });
    }

    items.forEach((item) => {
      const catalogService = item.serviceId ? serviceById.get(item.serviceId) : undefined;
      const catalogPrice = catalogService?.basePrice;
      const priceChanged = typeof catalogPrice === "number" && Math.abs(item.unitPrice - catalogPrice) > 0.009;

      if (priceChanged) {
        requirements.push({
          key: buildApprovalKey([quoteReference, "quote_item_price_change", item.id, catalogPrice, item.unitPrice, item.quantity]),
          type: "quote_item_price_change",
          title: approvalTypeLabels.quote_item_price_change,
          description: `${item.name}: precio de catálogo ${formatCurrency(catalogPrice)} contra precio capturado ${formatCurrency(item.unitPrice)}.`,
          entityLabel: item.name,
          reason: `Cambio manual de precio en la partida ${item.name}.`,
          before: { unitPrice: catalogPrice, source: "catalog" },
          after: { unitPrice: item.unitPrice, quantity: item.quantity, source: item.source },
          metadata: {
            folio: currentQuote?.folio ?? null,
            localQuoteId: currentQuoteId,
            itemId: item.id,
            serviceId: item.serviceId ?? null,
            itemName: item.name,
          },
        });
      }

      if (item.requiresApproval && !priceChanged) {
        requirements.push({
          key: buildApprovalKey([quoteReference, "manual_priced_item", item.id, item.unitPrice, item.quantity]),
          type: "manual_priced_item",
          title: approvalTypeLabels.manual_priced_item,
          description: `${item.name}: concepto marcado para revisión interna con precio ${formatCurrency(item.unitPrice)}.`,
          entityLabel: item.name,
          reason: `Concepto manual o especial con precio requiere autorización: ${item.name}.`,
          before: { catalogItem: false },
          after: { unitPrice: item.unitPrice, quantity: item.quantity, source: item.source, requiresApproval: item.requiresApproval },
          metadata: {
            folio: currentQuote?.folio ?? null,
            localQuoteId: currentQuoteId,
            itemId: item.id,
            serviceId: item.serviceId ?? null,
            itemName: item.name,
          },
        });
      }
    });

    return requirements;
  }, [catalogServices, client.clientName, client.company, client.projectName, currentQuote?.folio, currentQuoteId, items, rules.discountPercent, totals.discountAmount, totals.suggestedInitialPayment, totals.suggestedMonthlyPayment]);

  const approvalByKey = useMemo(() => {
    const map = new Map<string, ApprovalTracker>();

    approvalRequests.forEach((approval) => {
      const key = getApprovalKey(approval);
      if (key) map.set(key, approval);
    });

    return map;
  }, [approvalRequests]);

  const blockingApprovalRequirements = useMemo(() => {
    return approvalRequirements.filter((requirement) => approvalByKey.get(requirement.key)?.status !== "approved");
  }, [approvalByKey, approvalRequirements]);

  const hasBlockingApprovals = blockingApprovalRequirements.length > 0;`,
);

replaceOnce(
  "approval functions",
  `  function syncSavedQuoteToDatabase(quote: SavedQuote) {
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
  }`,
  `  function syncSavedQuoteToDatabase(quote: SavedQuote) {
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

  async function loadApprovalsForQuote(quoteId: string | null = currentQuoteId) {
    if (!quoteId) {
      setApprovalRequests([]);
      return;
    }

    setApprovalLoading(true);

    try {
      const response = await fetch(`/api/approvals?quoteId=${encodeURIComponent(quoteId)}&take=200`, { cache: "no-store" });
      const data = (await response.json()) as { ok?: boolean; approvals?: ApprovalTracker[]; error?: string };

      if (!response.ok || !data.ok || !Array.isArray(data.approvals)) {
        console.warn("No se pudieron cargar autorizaciones de la cotización.", data.error);
        return;
      }

      setApprovalRequests(data.approvals);
    } catch (error) {
      console.warn("No se pudieron cargar autorizaciones de la cotización.", error);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function requestApproval(requirement: ApprovalRequirement) {
    if (!currentQuoteId) {
      showSavedMessage("Guarda primero como borrador para poder solicitar autorizaciones.");
      return;
    }

    if (approvalByKey.get(requirement.key)?.status === "pending") {
      showSavedMessage("Esta autorización ya está pendiente.");
      return;
    }

    setApprovalSavingKey(requirement.key);

    try {
      const draftQuote = { ...buildSavedQuote("draft"), lockedAt: undefined };
      const syncResult = await syncQuoteToDatabase(draftQuote);

      if (!syncResult.ok) {
        showSavedMessage(syncResult.error ?? "No se pudo sincronizar la cotización antes de solicitar autorización.");
        return;
      }

      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: requirement.type,
          quoteId: currentQuoteId,
          reason: requirement.reason,
          before: requirement.before,
          after: requirement.after,
          metadata: {
            ...requirement.metadata,
            approvalKey: requirement.key,
            approvalTitle: requirement.title,
            approvalEntity: requirement.entityLabel,
          },
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        showSavedMessage(data.error ?? "No se pudo crear la solicitud de autorización.");
        return;
      }

      await loadApprovalsForQuote(currentQuoteId);
      showSavedMessage(`Autorización solicitada: ${requirement.title}.`);
    } catch (error) {
      console.error("No se pudo solicitar autorización.", error);
      showSavedMessage("No se pudo conectar para solicitar autorización.");
    } finally {
      setApprovalSavingKey("");
    }
  }`,
);

replaceOnce(
  "save guard",
  `    if (isPastDateInputValue(client.targetDeliveryDate)) {
      showSavedMessage("La fecha objetivo de entrega no puede ser una fecha pasada.");
      return;
    }

    const quote = {`,
  `    if (isPastDateInputValue(client.targetDeliveryDate)) {
      showSavedMessage("La fecha objetivo de entrega no puede ser una fecha pasada.");
      return;
    }

    if (status !== "draft" && hasBlockingApprovals) {
      showSavedMessage("Hay movimientos que requieren autorización antes de enviar o cerrar la cotización.");
      return;
    }

    const quote = {`,
);

replaceOnce(
  "approval panel",
  `            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Guardar cotización</h2>
                  <p>En Sprint 1.1 se guarda localmente en este navegador.</p>
                </div>
              </div>`,
  `            {approvalRequirements.length > 0 && (
              <section className="card">
                <div className="card-title">
                  <div>
                    <h2>Autorizaciones requeridas</h2>
                    <p>Estos movimientos no pueden enviarse o cerrarse hasta quedar aprobados.</p>
                  </div>
                  <div className="quote-actions">
                    <button className="btn ghost" type="button" disabled={approvalLoading || !currentQuoteId} onClick={() => void loadApprovalsForQuote(currentQuoteId)}>
                      {approvalLoading ? "Actualizando..." : "Actualizar estado"}
                    </button>
                    <a className="btn primary" href="/approvals">Ver autorizaciones</a>
                  </div>
                </div>

                <div className="table-like">
                  {approvalRequirements.map((requirement) => {
                    const approval = approvalByKey.get(requirement.key);
                    const status = approval?.status ?? "not_requested";
                    const canRequest = Boolean(currentQuoteId) && status !== "pending" && status !== "approved";

                    return (
                      <article className="history-row" key={requirement.key}>
                        <div>
                          <div className="history-heading">
                            <h4>{requirement.title}</h4>
                            <span className={`status-badge ${getApprovalBadgeClass(status)}`}>{approvalStatusLabels[status]}</span>
                          </div>
                          <p><strong>{requirement.entityLabel}</strong> · {requirement.description}</p>
                          {approval?.resolutionNotes && <p><strong>Respuesta:</strong> {approval.resolutionNotes}</p>}
                          {!currentQuoteId && <p>Guarda primero como borrador para poder ligar la autorización a un folio.</p>}
                        </div>
                        <div className="history-actions">
                          <button
                            className="btn primary"
                            type="button"
                            disabled={!canRequest || approvalSavingKey === requirement.key}
                            onClick={() => void requestApproval(requirement)}
                          >
                            {approvalSavingKey === requirement.key ? "Solicitando..." : status === "rejected" ? "Solicitar de nuevo" : "Solicitar autorización"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className={`notice ${hasBlockingApprovals ? "warning" : "success"}`}>
                  {hasBlockingApprovals
                    ? "Hay autorizaciones pendientes, rechazadas o no solicitadas. Puedes guardar borrador, pero no enviar ni aceptar todavía."
                    : "Todas las autorizaciones requeridas están aprobadas. Ya puedes enviar o cerrar la cotización."}
                </div>
              </section>
            )}

            <section className="card">
              <div className="card-title">
                <div>
                  <h2>Guardar cotización</h2>
                  <p>Guarda borrador, envía o cierra la cotización según permisos y autorizaciones.</p>
                </div>
              </div>`,
);

replaceOnce(
  "save button draft void",
  '<button className="btn ghost" disabled={!canEditCurrentQuote} onClick={() => saveQuote("draft")}>Guardar borrador</button>',
  '<button className="btn ghost" disabled={!canEditCurrentQuote} onClick={() => void saveQuote("draft")}>Guardar borrador</button>',
);

replaceOnce(
  "save button sent void",
  '<button className="btn primary" disabled={!canEditCurrentQuote} onClick={() => saveQuote("sent")}>Guardar como enviada</button>',
  '<button className="btn primary" disabled={!canEditCurrentQuote || hasBlockingApprovals} onClick={() => void saveQuote("sent")}>Guardar como enviada</button>',
);

replaceOnce(
  "save button accepted void",
  '<button className="btn success" disabled={!canEditCurrentQuote || !canChangeQuoteStatus} onClick={() => saveQuote("accepted")}>Marcar aceptada</button>',
  '<button className="btn success" disabled={!canEditCurrentQuote || !canChangeQuoteStatus || hasBlockingApprovals} onClick={() => void saveQuote("accepted")}>Marcar aceptada</button>',
);

fs.writeFileSync(filePath, source);
fs.rmSync(oldHelperPath, { force: true });
fs.rmSync(selfPath, { force: true });
console.log("Semáforo general de autorizaciones aplicado y scripts temporales eliminados.");
