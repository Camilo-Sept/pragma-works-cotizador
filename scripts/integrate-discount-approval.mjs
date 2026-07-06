import fs from "node:fs";

const filePath = "components/CotizadorApp.tsx";
const scriptPath = "scripts/integrate-discount-approval.mjs";
let source = fs.readFileSync(filePath, "utf8");

if (source.includes("requestDiscountApproval")) {
  console.log("La integración de descuento ya existe. No se aplicaron cambios.");
  fs.rmSync(scriptPath, { force: true });
  process.exit(0);
}

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`No se encontró bloque esperado: ${label}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  "discount state",
  '  const [loginError, setLoginError] = useState("");',
  '  const [loginError, setLoginError] = useState("");\n  const [discountApprovalRequestedKey, setDiscountApprovalRequestedKey] = useState("");\n  const [discountApprovalLoading, setDiscountApprovalLoading] = useState(false);',
);

replaceOnce(
  "discount computed state",
  '  const canEditPricingRules = roleCan("edit_pricing_rules");',
  `  const canEditPricingRules = roleCan("edit_pricing_rules");
  const discountRequiresApproval = rules.discountPercent > 10;
  const discountApprovalKey = useMemo(
    () => [
      currentQuoteId ?? "new",
      client.company || client.clientName || "cliente-pendiente",
      client.projectName || "proyecto-pendiente",
      rules.discountPercent,
      totals.oneTimeSubtotal,
      totals.discountAmount,
      items.map((item) => \`${'${item.id}:${item.name}:${item.unitPrice}:${item.quantity}'}\`).join("|"),
    ].join("::"),
    [client.clientName, client.company, client.projectName, currentQuoteId, items, rules.discountPercent, totals.discountAmount, totals.oneTimeSubtotal],
  );`,
);

replaceOnce(
  "approval requester",
  '  function buildSavedQuote(status: QuoteStatus): SavedQuote {',
  `  async function requestDiscountApproval(requestedStatus: QuoteStatus) {
    if (!discountRequiresApproval) return true;

    if (discountApprovalRequestedKey === discountApprovalKey) {
      return true;
    }

    setDiscountApprovalLoading(true);

    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "discount_over_10",
          reason: \`Descuento comercial de ${'${rules.discountPercent}'}% requiere autorización antes de enviar o cerrar la cotización.\`,
          before: {
            discountPercent: 10,
          },
          after: {
            discountPercent: rules.discountPercent,
            discountAmount: totals.discountAmount,
            suggestedInitialPayment: totals.suggestedInitialPayment,
            suggestedMonthlyPayment: totals.suggestedMonthlyPayment,
          },
          metadata: {
            requestedStatus,
            localQuoteId: currentQuoteId,
            folio: currentQuote?.folio ?? null,
            clientName: client.clientName || null,
            company: client.company || null,
            projectName: client.projectName || null,
            itemCount: items.length,
          },
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        showSavedMessage(data.error ?? "No se pudo crear la autorización de descuento.");
        return false;
      }

      setDiscountApprovalRequestedKey(discountApprovalKey);
      return true;
    } catch (error) {
      console.error("No se pudo solicitar autorización de descuento.", error);
      showSavedMessage("No se pudo conectar para solicitar autorización de descuento.");
      return false;
    } finally {
      setDiscountApprovalLoading(false);
    }
  }

  function buildSavedQuote(status: QuoteStatus): SavedQuote {`,
);

replaceOnce(
  "async save quote",
  '  function saveQuote(status: QuoteStatus = quoteStatus) {',
  '  async function saveQuote(status: QuoteStatus = quoteStatus) {',
);

replaceOnce(
  "discount approval gate",
  `    const quote = {
      ...buildSavedQuote(status),
      lockedAt: status === "draft" ? undefined : (currentQuote?.lockedAt ?? new Date().toISOString()),
    };`,
  `    let effectiveStatus = status;

    if (discountRequiresApproval) {
      const approvalRequested = await requestDiscountApproval(status);
      if (!approvalRequested) return;
      effectiveStatus = "draft";
    }

    const quote = {
      ...buildSavedQuote(effectiveStatus),
      lockedAt: effectiveStatus === "draft" ? undefined : (currentQuote?.lockedAt ?? new Date().toISOString()),
    };`,
);

replaceOnce(
  "quote status after save",
  '    setQuoteStatus(status);',
  '    setQuoteStatus(effectiveStatus);',
);

replaceOnce(
  "quote save message",
  '    showSavedMessage(`Cotización ${quote.folio} guardada como ${statusLabels[status]}.`);',
  '    showSavedMessage(discountRequiresApproval ? `Descuento mayor a 10%. Se creó autorización y ${quote.folio} quedó como borrador.` : `Cotización ${quote.folio} guardada como ${statusLabels[effectiveStatus]}.`);',
);

replaceOnce(
  "discount notice",
  `                <div className="notice info">
                  {currentQuote ? (
                    <>Editando <strong>{currentQuote.folio}</strong>. Última actualización: {formatDateTime(currentQuote.updatedAt)}.</>
                  ) : (
                    <>Cotización nueva. Al guardar se asignará un folio automático tipo <strong>PW-000001</strong>.</>
                  )}
                </div>`,
  `                <div className="notice info">
                  {currentQuote ? (
                    <>Editando <strong>{currentQuote.folio}</strong>. Última actualización: {formatDateTime(currentQuote.updatedAt)}.</>
                  ) : (
                    <>Cotización nueva. Al guardar se asignará un folio automático tipo <strong>PW-000001</strong>.</>
                  )}
                </div>
                {discountRequiresApproval && (
                  <div className="notice warning">
                    Descuento de <strong>{rules.discountPercent}%</strong>. Al guardar se creará una autorización y la cotización quedará como borrador hasta ser aprobada.
                  </div>
                )}`,
);

replaceOnce(
  "save buttons disabled",
  '<button className="btn ghost" disabled={!canEditCurrentQuote} onClick={() => saveQuote("draft")}>Guardar borrador</button>',
  '<button className="btn ghost" disabled={!canEditCurrentQuote || discountApprovalLoading} onClick={() => void saveQuote("draft")}>Guardar borrador</button>',
);

replaceOnce(
  "sent button disabled",
  '<button className="btn primary" disabled={!canEditCurrentQuote} onClick={() => saveQuote("sent")}>Guardar como enviada</button>',
  '<button className="btn primary" disabled={!canEditCurrentQuote || discountApprovalLoading} onClick={() => void saveQuote("sent")}>Guardar como enviada</button>',
);

replaceOnce(
  "accepted button disabled",
  '<button className="btn success" disabled={!canEditCurrentQuote || !canChangeQuoteStatus} onClick={() => saveQuote("accepted")}>Marcar aceptada</button>',
  '<button className="btn success" disabled={!canEditCurrentQuote || !canChangeQuoteStatus || discountApprovalLoading} onClick={() => void saveQuote("accepted")}>Marcar aceptada</button>',
);

fs.writeFileSync(filePath, source);
fs.rmSync(scriptPath, { force: true });
console.log("Integración de autorización por descuento mayor a 10% aplicada.");
