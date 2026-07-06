import { NextResponse } from "next/server";
import { ApprovalStatus, ApprovalType, AuditAction, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const typeMap: Record<string, ApprovalType> = {
  discount_over_10: ApprovalType.DISCOUNT_OVER_10,
  quote_item_price_change: ApprovalType.QUOTE_ITEM_PRICE_CHANGE,
  manual_priced_item: ApprovalType.MANUAL_PRICED_ITEM,
  catalog_price_change: ApprovalType.CATALOG_PRICE_CHANGE,
  pricing_rule_change: ApprovalType.PRICING_RULE_CHANGE,
};

const statusMap: Record<string, ApprovalStatus> = {
  pending: ApprovalStatus.PENDING,
  approved: ApprovalStatus.APPROVED,
  rejected: ApprovalStatus.REJECTED,
  cancelled: ApprovalStatus.CANCELLED,
};

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseTake(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}

function normalizeType(value: unknown) {
  if (typeof value !== "string") return null;
  return typeMap[value.trim().toLowerCase()] ?? null;
}

function mapApproval(
  approval: Prisma.ApprovalRequestGetPayload<{
    include: {
      quote: true;
      quoteItem: true;
      requestedBy: true;
      resolvedBy: true;
    };
  }>,
) {
  return {
    id: approval.id,
    quoteId: approval.quoteId,
    quote: approval.quote
      ? {
          id: approval.quote.id,
          folio: approval.quote.folio,
        }
      : null,
    quoteItemId: approval.quoteItemId,
    quoteItem: approval.quoteItem
      ? {
          id: approval.quoteItem.id,
          name: approval.quoteItem.name,
          unitPrice: Number(approval.quoteItem.unitPrice),
        }
      : null,
    requestedByUserId: approval.requestedByUserId,
    requestedBy: {
      id: approval.requestedBy.id,
      name: approval.requestedBy.name,
      email: approval.requestedBy.email,
      role: approval.requestedBy.role.toLowerCase(),
    },
    resolvedByUserId: approval.resolvedByUserId,
    resolvedBy: approval.resolvedBy
      ? {
          id: approval.resolvedBy.id,
          name: approval.resolvedBy.name,
          email: approval.resolvedBy.email,
          role: approval.resolvedBy.role.toLowerCase(),
        }
      : null,
    type: approval.type.toLowerCase(),
    status: approval.status.toLowerCase(),
    reason: approval.reason,
    resolutionNotes: approval.resolutionNotes,
    before: approval.before,
    after: approval.after,
    metadata: approval.metadata,
    requestedAt: approval.requestedAt.toISOString(),
    resolvedAt: approval.resolvedAt?.toISOString() ?? null,
    createdAt: approval.createdAt.toISOString(),
    updatedAt: approval.updatedAt.toISOString(),
  };
}

function requestAuditAction(type: ApprovalType) {
  switch (type) {
    case ApprovalType.DISCOUNT_OVER_10:
      return AuditAction.DISCOUNT_APPROVAL_REQUESTED;
    case ApprovalType.QUOTE_ITEM_PRICE_CHANGE:
      return AuditAction.PRICE_CHANGE_REQUESTED;
    case ApprovalType.MANUAL_PRICED_ITEM:
      return AuditAction.MANUAL_ITEM_REQUESTED;
    case ApprovalType.CATALOG_PRICE_CHANGE:
      return AuditAction.CATALOG_PRICE_CHANGE_REQUESTED;
    case ApprovalType.PRICING_RULE_CHANGE:
      return AuditAction.PRICING_RULE_CHANGE_REQUESTED;
    default:
      return AuditAction.APPROVAL_REQUESTED;
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();

    if (!auth.ok) {
      return auth.response;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        role: true,
        active: true,
        canApproveDiscountsOver10: true,
        canApprovePriceChanges: true,
        canApproveManualPricedItems: true,
        canApproveCatalogPriceChanges: true,
      },
    });

    if (!currentUser?.active) {
      return NextResponse.json(
        { ok: false, error: "Tu usuario no está activo." },
        { status: 403 },
      );
    }

    const canSeeAll =
      currentUser.role === UserRole.ADMIN ||
      currentUser.canApproveDiscountsOver10 ||
      currentUser.canApprovePriceChanges ||
      currentUser.canApproveManualPricedItems ||
      currentUser.canApproveCatalogPriceChanges;

    const url = new URL(request.url);
    const statusText = url.searchParams.get("status")?.trim().toLowerCase();
    const typeText = url.searchParams.get("type")?.trim().toLowerCase();
    const quoteId = url.searchParams.get("quoteId")?.trim();
    const requestedByUserId = url.searchParams.get("requestedByUserId")?.trim();
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));
    const take = parseTake(url.searchParams.get("take"));

    const where: Prisma.ApprovalRequestWhereInput = {};

    if (!canSeeAll) {
      where.requestedByUserId = auth.user.id;
    } else if (requestedByUserId) {
      where.requestedByUserId = requestedByUserId;
    }

    if (statusText && statusMap[statusText]) where.status = statusMap[statusText];
    if (typeText && typeMap[typeText]) where.type = typeMap[typeText];
    if (quoteId) where.quoteId = quoteId;
    if (from || to) {
      where.requestedAt = {
        gte: from,
        lte: to,
      };
    }

    const approvals = await prisma.approvalRequest.findMany({
      where,
      include: {
        quote: true,
        quoteItem: true,
        requestedBy: true,
        resolvedBy: true,
      },
      orderBy: { requestedAt: "desc" },
      take,
    });

    return NextResponse.json({ ok: true, approvals: approvals.map(mapApproval) });
  } catch (error) {
    console.error("Error loading approvals", error);

    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar las autorizaciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    if (!auth.ok) {
      return auth.response;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { active: true },
    });

    if (!currentUser?.active) {
      return NextResponse.json(
        { ok: false, error: "Tu usuario no está activo." },
        { status: 403 },
      );
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const type = normalizeType(payload?.type);
    const quoteId = typeof payload?.quoteId === "string" ? payload.quoteId.trim() || null : null;
    const quoteItemId = typeof payload?.quoteItemId === "string" ? payload.quoteItemId.trim() || null : null;
    const reason = typeof payload?.reason === "string" ? payload.reason.trim() || null : null;
    const before = payload?.before && typeof payload.before === "object" ? (payload.before as Prisma.InputJsonObject) : undefined;
    const after = payload?.after && typeof payload.after === "object" ? (payload.after as Prisma.InputJsonObject) : undefined;
    const metadata = payload?.metadata && typeof payload.metadata === "object" ? (payload.metadata as Prisma.InputJsonObject) : undefined;

    if (!type) {
      return NextResponse.json(
        { ok: false, error: "Tipo de autorización inválido." },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { ok: false, error: "El motivo de la solicitud es obligatorio." },
        { status: 400 },
      );
    }

    const approval = await prisma.$transaction(async (tx) => {
      const created = await tx.approvalRequest.create({
        data: {
          type,
          status: ApprovalStatus.PENDING,
          quoteId,
          quoteItemId,
          requestedByUserId: auth.user.id,
          reason,
          before,
          after,
          metadata,
        },
        include: {
          quote: true,
          quoteItem: true,
          requestedBy: true,
          resolvedBy: true,
        },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.user.id,
        quoteId,
        action: requestAuditAction(type),
        entityType: "approval_request",
        entityId: created.id,
        before,
        after,
        metadata: {
          type: type.toLowerCase(),
          reason,
          quoteItemId,
          ...((metadata as Record<string, unknown> | undefined) ?? {}),
        },
      });

      return created;
    });

    return NextResponse.json({ ok: true, approval: mapApproval(approval) }, { status: 201 });
  } catch (error) {
    console.error("Error creating approval", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo crear la solicitud de autorización." },
      { status: 500 },
    );
  }
}
