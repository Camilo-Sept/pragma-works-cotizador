import { NextResponse } from "next/server";
import {
  AuditAction,
  BillingType,
  Prisma,
  QuoteMode,
  QuoteStatus,
  ServiceCategory,
  ServiceSource,
  SourceCodeOption,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SavedQuote } from "@/types/quote";

export const dynamic = "force-dynamic";

const quoteStatusMap = {
  draft: QuoteStatus.DRAFT,
  sent: QuoteStatus.SENT,
  accepted: QuoteStatus.ACCEPTED,
  rejected: QuoteStatus.REJECTED,
} as const;

const quoteModeMap = {
  one_time: QuoteMode.ONE_TIME,
  rental: QuoteMode.RENTAL,
  hybrid: QuoteMode.HYBRID,
} as const;

const sourceCodeOptionMap = {
  none: SourceCodeOption.NONE,
  delivery_after_payment: SourceCodeOption.DELIVERY_AFTER_PAYMENT,
  full_buyout: SourceCodeOption.FULL_BUYOUT,
} as const;

const billingTypeMap = {
  one_time: BillingType.ONE_TIME,
  monthly: BillingType.MONTHLY,
  annual: BillingType.ANNUAL,
  hourly: BillingType.HOURLY,
} as const;

const serviceCategoryMap = {
  web: ServiceCategory.WEB,
  system: ServiceCategory.SYSTEM,
  mobile: ServiceCategory.MOBILE,
  desktop: ServiceCategory.DESKTOP,
  automation: ServiceCategory.AUTOMATION,
  ai: ServiceCategory.AI,
  support: ServiceCategory.SUPPORT,
  infrastructure: ServiceCategory.INFRASTRUCTURE,
  other: ServiceCategory.OTHER,
} as const;

const serviceSourceMap = {
  catalog: ServiceSource.CATALOG,
  manual: ServiceSource.MANUAL,
} as const;

function decimal(value: unknown) {
  const parsed = Number(value);
  return new Prisma.Decimal(Number.isFinite(parsed) ? parsed : 0);
}

function dateFromInput(value?: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPastDate(value?: string) {
  const date = dateFromInput(value);
  if (!date) return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function validateQuotePayload(value: unknown): SavedQuote | null {
  if (!value || typeof value !== "object") return null;

  const quote = value as SavedQuote;
  if (!quote.id || !quote.folio || !quote.client || !Array.isArray(quote.items)) return null;
  if (!quote.client.clientName?.trim() && !quote.client.company?.trim()) return null;
  if (quote.items.length === 0) return null;
  if (!quoteStatusMap[quote.status] || !quoteModeMap[quote.mode]) return null;
  if (!sourceCodeOptionMap[quote.sourceCodeOption]) return null;
  if (!quote.validUntil || !dateFromInput(quote.validUntil)) return null;
  if (isPastDate(quote.validUntil) || isPastDate(quote.client.targetDeliveryDate)) return null;

  return quote;
}

function quoteSelect() {
  return {
    include: {
      client: true,
      items: {
        orderBy: { createdAt: "asc" as const },
      },
    },
  };
}

export async function GET() {
  try {
    const quotes = await prisma.quote.findMany({
      ...quoteSelect(),
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ ok: true, quotes });
  } catch (error) {
    console.error("Error loading quotes from database", error);

    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar las cotizaciones desde la base de datos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const quote = validateQuotePayload(await request.json().catch(() => null));

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "La cotización no contiene los datos mínimos para guardarse." },
        { status: 400 },
      );
    }

    const savedQuote = await prisma.$transaction(async (tx) => {
      const clientName = quote.client.clientName.trim() || quote.client.company.trim();
      const company = quote.client.company.trim() || null;
      const email = quote.client.email.trim() || null;
      const phone = quote.client.phone.trim() || null;
      const clientNotes = quote.client.notes.trim() || null;

      const existingClient = await tx.client.findFirst({
        where: email
          ? { email }
          : {
              clientName,
              company,
            },
        orderBy: { updatedAt: "desc" },
      });

      const client = existingClient
        ? await tx.client.update({
            where: { id: existingClient.id },
            data: {
              clientName,
              company,
              email,
              phone,
              notes: clientNotes,
            },
          })
        : await tx.client.create({
            data: {
              clientName,
              company,
              email,
              phone,
              notes: clientNotes,
            },
          });

      const defaultRuleSet = await tx.pricingRuleSet.findFirst({
        where: { isDefault: true },
        orderBy: { updatedAt: "desc" },
      });

      const existingQuote =
        (await tx.quote.findUnique({ where: { id: quote.id } })) ??
        (await tx.quote.findUnique({ where: { folio: quote.folio } }));

      const quoteData = {
        id: quote.id,
        folio: quote.folio,
        status: quoteStatusMap[quote.status],
        mode: quoteModeMap[quote.mode],
        sourceCodeOption: sourceCodeOptionMap[quote.sourceCodeOption],
        clientId: client.id,
        pricingRuleSetId: defaultRuleSet?.id ?? null,
        rulesSnapshot: quote.rules,
        validUntil: dateFromInput(quote.validUntil) ?? new Date(),
        targetDeliveryDate: dateFromInput(quote.client.targetDeliveryDate),
        clientNotes,
        internalNotes: quote.client.projectName.trim()
          ? `Proyecto: ${quote.client.projectName.trim()}`
          : null,
        oneTimeSubtotal: decimal(quote.totals.oneTimeSubtotal),
        monthlySubtotal: decimal(quote.totals.monthlySubtotal),
        annualSubtotal: decimal(quote.totals.annualSubtotal),
        hoursSubtotal: decimal(quote.totals.hoursSubtotal),
        riskCharge: decimal(quote.totals.riskCharge),
        urgencyCharge: decimal(quote.totals.urgencyCharge),
        commissionCharge: decimal(quote.totals.commissionCharge),
        discountAmount: decimal(quote.totals.discountAmount),
        sourceCodeCharge: decimal(quote.totals.sourceCodeCharge),
        suggestedInitialPayment: decimal(quote.totals.suggestedInitialPayment),
        suggestedMonthlyPayment: decimal(quote.totals.suggestedMonthlyPayment),
        suggestedAnnualRenewal: decimal(quote.totals.suggestedAnnualRenewal),
        estimatedHours: decimal(quote.totals.estimatedHours),
        effectiveHourlyRate: decimal(quote.totals.effectiveHourlyRate),
        revisionOfId: quote.revisionOf ?? null,
        revisionNumber: quote.revisionNumber ?? null,
        lockedAt: dateFromInput(quote.lockedAt),
        archivedAt: dateFromInput(quote.archivedAt),
        createdAt: dateFromInput(quote.createdAt) ?? new Date(),
        updatedAt: dateFromInput(quote.updatedAt) ?? new Date(),
      };

      const persistedQuote = existingQuote
        ? await tx.quote.update({
            where: { id: existingQuote.id },
            data: quoteData,
          })
        : await tx.quote.create({
            data: quoteData,
          });

      await tx.quoteItem.deleteMany({
        where: { quoteId: persistedQuote.id },
      });

      const serviceIds = quote.items
        .map((item) => item.serviceId)
        .filter((serviceId): serviceId is string => Boolean(serviceId));
      const existingServices = serviceIds.length
        ? await tx.service.findMany({
            where: { id: { in: serviceIds } },
            select: { id: true },
          })
        : [];
      const existingServiceIds = new Set(existingServices.map((service) => service.id));

      if (quote.items.length > 0) {
        await tx.quoteItem.createMany({
          data: quote.items.map((item) => ({
            quoteId: persistedQuote.id,
            serviceId: item.serviceId && existingServiceIds.has(item.serviceId) ? item.serviceId : null,
            name: item.name,
            category: serviceCategoryMap[item.category] ?? ServiceCategory.OTHER,
            billingType: billingTypeMap[item.billingType] ?? BillingType.ONE_TIME,
            unitPrice: decimal(item.unitPrice),
            quantity: decimal(item.quantity),
            estimatedHours: decimal(item.estimatedHours),
            source: serviceSourceMap[item.source] ?? ServiceSource.MANUAL,
            requiresApproval: item.requiresApproval,
            notes: item.notes?.trim() || null,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          quoteId: persistedQuote.id,
          action: existingQuote ? AuditAction.UPDATE : AuditAction.CREATE,
          entityType: "quote",
          entityId: persistedQuote.id,
          after: {
            folio: quote.folio,
            status: quote.status,
            itemCount: quote.items.length,
            syncedFrom: "localStorage",
          },
        },
      });

      return tx.quote.findUnique({
        where: { id: persistedQuote.id },
        ...quoteSelect(),
      });
    });

    return NextResponse.json({ ok: true, quote: savedQuote });
  } catch (error) {
    console.error("Error saving quote to database", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo guardar la cotización en la base de datos." },
      { status: 500 },
    );
  }
}
