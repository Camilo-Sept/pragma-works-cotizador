import type {
  BillingType,
  ClientDraft,
  PricingRules,
  QuoteItem,
  QuoteMode,
  QuoteTotals,
  SourceCodeOption,
} from "@/types/quote";
import { companyProfile } from "@/data/company";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatBillingType(type: BillingType): string {
  const labels: Record<BillingType, string> = {
    one_time: "Único",
    monthly: "Mensual",
    annual: "Anual",
    hourly: "Por hora",
  };
  return labels[type];
}

export function formatQuoteMode(mode: QuoteMode): string {
  const labels: Record<QuoteMode, string> = {
    one_time: "Venta única",
    rental: "Renta mensual",
    hybrid: "Híbrido",
  };
  return labels[mode];
}

export function formatSourceCodeOption(option: SourceCodeOption): string {
  const labels: Record<SourceCodeOption, string> = {
    none: "No incluye código fuente",
    delivery_after_payment: "Entrega de código fuente al liquidar",
    full_buyout: "Compra total de código/derechos",
  };
  return labels[option];
}

export function calculateQuoteTotals(
  items: QuoteItem[],
  mode: QuoteMode,
  sourceCodeOption: SourceCodeOption,
  rules: PricingRules,
): QuoteTotals {
  const oneTimeSubtotal = items
    .filter((item) => item.billingType === "one_time" || item.billingType === "hourly")
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const monthlySubtotal = items
    .filter((item) => item.billingType === "monthly")
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const annualSubtotal = items
    .filter((item) => item.billingType === "annual")
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const estimatedHours = items.reduce(
    (sum, item) => sum + item.estimatedHours * item.quantity,
    0,
  );

  const riskCharge = oneTimeSubtotal * (rules.riskPercent / 100);
  const urgencyCharge = oneTimeSubtotal * (rules.urgencyPercent / 100);
  const commissionCharge = oneTimeSubtotal * (rules.commissionPercent / 100);
  const discountAmount = oneTimeSubtotal * (rules.discountPercent / 100);

  const adjustedOneTimeSubtotal = Math.max(
    oneTimeSubtotal + riskCharge + urgencyCharge + commissionCharge - discountAmount,
    oneTimeSubtotal > 0 ? rules.minimumOneTimePrice : 0,
  );

  const effectiveSourceCodeOption = mode === "rental" ? "none" : sourceCodeOption;
  const sourceCodePercent =
    effectiveSourceCodeOption === "delivery_after_payment"
      ? rules.sourceDeliveryPercent
      : effectiveSourceCodeOption === "full_buyout"
        ? rules.sourceBuyoutPercent
        : 0;

  const sourceCodeCharge = adjustedOneTimeSubtotal * (sourceCodePercent / 100);

  let suggestedInitialPayment = 0;
  let suggestedMonthlyPayment = monthlySubtotal;

  if (mode === "one_time") {
    suggestedInitialPayment = adjustedOneTimeSubtotal + sourceCodeCharge;
  }

  if (mode === "rental") {
    suggestedInitialPayment = adjustedOneTimeSubtotal * (rules.rentalInitialPercent / 100);
    suggestedMonthlyPayment += adjustedOneTimeSubtotal * (rules.rentalMonthlyPercent / 100);
  }

  if (mode === "hybrid") {
    suggestedInitialPayment = adjustedOneTimeSubtotal * (rules.hybridInitialPercent / 100) + sourceCodeCharge;
    suggestedMonthlyPayment += adjustedOneTimeSubtotal * (rules.hybridMonthlyPercent / 100);
  }

  if (suggestedMonthlyPayment > 0) {
    suggestedMonthlyPayment = Math.max(suggestedMonthlyPayment, rules.minimumMonthlyPrice);
  }

  const includesFixedWebsite = items.some((item) => item.serviceId === "svc-web-fixed");
  const suggestedAnnualRenewal = annualSubtotal + (includesFixedWebsite ? rules.websiteAnnualRenewal : 0);

  const commercialNotes: string[] = [];

  if (mode === "rental") {
    commercialNotes.push(
      "En modalidad de renta mensual no se entrega código fuente; el cliente adquiere derecho de uso mientras la mensualidad se mantenga activa.",
    );
  }

  if (includesFixedWebsite) {
    commercialNotes.push(
      "La página web fija incluye 1 año de servicio básico y 3 mantenimientos simples durante el primer año.",
    );
  }

  if (items.some((item) => item.source === "manual")) {
    commercialNotes.push(
      "La cotización contiene conceptos agregados manualmente; deben validarse antes de enviar propuesta final.",
    );
  }

  if (items.some((item) => item.requiresApproval)) {
    commercialNotes.push(
      "Algunos conceptos requieren aprobación interna por precio, alcance o complejidad.",
    );
  }

  commercialNotes.push("Precios expresados en MXN. No incluyen IVA salvo que se indique lo contrario.");

  return {
    oneTimeSubtotal,
    monthlySubtotal,
    annualSubtotal,
    hoursSubtotal: estimatedHours,
    riskCharge,
    urgencyCharge,
    commissionCharge,
    discountAmount,
    sourceCodeCharge,
    suggestedInitialPayment,
    suggestedMonthlyPayment,
    suggestedAnnualRenewal,
    estimatedHours,
    effectiveHourlyRate:
      estimatedHours > 0 ? suggestedInitialPayment / estimatedHours : suggestedInitialPayment,
    commercialNotes,
  };
}

export function buildWhatsAppSummary(params: {
  client: ClientDraft;
  items: QuoteItem[];
  mode: QuoteMode;
  sourceCodeOption: SourceCodeOption;
  totals: QuoteTotals;
}): string {
  const { client, items, mode, sourceCodeOption, totals } = params;
  const lines = [
    `Cotización preliminar - ${companyProfile.name}`,
    companyProfile.descriptor,
    "",
    `Cliente: ${client.company || client.clientName || "Pendiente"}`,
    client.projectName ? `Proyecto: ${client.projectName}` : "Proyecto: Pendiente de definir",
    `Modalidad: ${formatQuoteMode(mode)}`,
    `Código fuente: ${formatSourceCodeOption(mode === "rental" ? "none" : sourceCodeOption)}`,
    "",
    "Incluye:",
    ...items.map((item) => `- ${item.name} (${formatBillingType(item.billingType)})`),
    "",
    `Pago inicial sugerido: ${formatCurrency(totals.suggestedInitialPayment)}`,
  ];

  if (totals.suggestedMonthlyPayment > 0) {
    lines.push(`Mensualidad sugerida: ${formatCurrency(totals.suggestedMonthlyPayment)}`);
  }

  if (totals.suggestedAnnualRenewal > 0) {
    lines.push(`Renovación anual sugerida: ${formatCurrency(totals.suggestedAnnualRenewal)}`);
  }

  lines.push("", "Notas:", ...totals.commercialNotes.map((note) => `- ${note}`));
  lines.push("", "Confidencialidad:", companyProfile.confidentialityDisclaimer);

  return lines.join("\n");
}
