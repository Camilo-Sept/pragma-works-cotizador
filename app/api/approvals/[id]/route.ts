import { NextResponse } from "next/server";
import { ApprovalStatus, ApprovalType, AuditAction, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { forbiddenResponse, requireAuth } from "@/lib/serverAuth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Approver = {
  role: UserRole;
  canApproveDiscountsOver10: boolean;
  canApprovePriceChanges: boolean;
  canApproveManualPricedItems: boolean;
  canApproveCatalogPriceChanges: boolean;
};

function canApprove(type: ApprovalType, user: Approver) {
  if (user.role === UserRole.ADMIN) return true;

  switch (type) {
    case ApprovalType.DISCOUNT_OVER_10:
      return user.canApproveDiscountsOver10;
    case ApprovalType.QUOTE_ITEM_PRICE_CHANGE:
      return user.canApprovePriceChanges;
    case ApprovalType.MANUAL_PRICED_ITEM:
      return user.canApproveManualPricedItems;
    case ApprovalType.CATALOG_PRICE_CHANGE:
    case ApprovalType.PRICING_RULE_CHANGE:
      return user.canApproveCatalogPriceChanges;
    default:
      return false;
  }
}

function approvalAction(type: ApprovalType, status: ApprovalStatus) {
  if (status === ApprovalStatus.APPROVED) {
    switch (type) {
      case ApprovalType.DISCOUNT_OVER_10:
        return AuditAction.DISCOUNT_APPROVED;
      case ApprovalType.QUOTE_ITEM_PRICE_CHANGE:
        return AuditAction.PRICE_CHANGE_APPROVED;
      case ApprovalType.MANUAL_PRICED_ITEM:
        return AuditAction.MANUAL_ITEM_APPROVED;
      case ApprovalType.CATALOG_PRICE_CHANGE:
        return AuditAction.CATALOG_PRICE_CHANGE_APPROVED;
      case ApprovalType.PRICING_RULE_CHANGE:
        return AuditAction.PRICING_RULE_CHANGE_APPROVED;
      default:
        return AuditAction.APPROVAL_APPROVED;
    }
  }

  if (status === ApprovalStatus.REJECTED) {
    switch (type) {
      case ApprovalType.DISCOUNT_OVER_10:
        return AuditAction.DISCOUNT_REJECTED;
      case ApprovalType.QUOTE_ITEM_PRICE_CHANGE:
        return AuditAction.PRICE_CHANGE_REJECTED;
      case ApprovalType.MANUAL_PRICED_ITEM:
        return AuditAction.MANUAL_ITEM_REJECTED;
      case ApprovalType.CATALOG_PRICE_CHANGE:
        return AuditAction.CATALOG_PRICE_CHANGE_REJECTED;
      case ApprovalType.PRICING_RULE_CHANGE:
        return AuditAction.PRICING_RULE_CHANGE_REJECTED;
      default:
        return AuditAction.APPROVAL_REJECTED;
    }
  }

  return AuditAction.APPROVAL_CANCELLED;
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const payload = (await request.json().catch(() => null)) as {
      status?: unknown;
      resolutionNotes?: unknown;
    } | null;
    const statusText = typeof payload?.status === "string" ? payload.status.trim().toLowerCase() : "";
    const resolutionNotes = typeof payload?.resolutionNotes === "string" ? payload.resolutionNotes.trim() || null : null;

    const nextStatus =
      statusText === "approved"
        ? ApprovalStatus.APPROVED
        : statusText === "rejected"
          ? ApprovalStatus.REJECTED
          : null;

    if (!nextStatus) {
      return NextResponse.json(
        { ok: false, error: "Sólo se permite aprobar o rechazar autorizaciones." },
        { status: 400 },
      );
    }

    const approver = await prisma.user.findUnique({
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

    if (!approver?.active) {
      return forbiddenResponse("Tu usuario no está activo.");
    }

    const existing = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        quote: true,
        quoteItem: true,
        requestedBy: true,
        resolvedBy: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Solicitud de autorización no encontrada." },
        { status: 404 },
      );
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      return NextResponse.json(
        { ok: false, error: "La solicitud ya fue resuelta." },
        { status: 409 },
      );
    }

    if (!canApprove(existing.type, approver)) {
      return forbiddenResponse("No tienes permiso para resolver este tipo de autorización.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const approval = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          resolvedByUserId: auth.user.id,
          resolvedAt: new Date(),
          resolutionNotes,
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
        quoteId: approval.quoteId,
        action: approvalAction(approval.type, nextStatus),
        entityType: "approval_request",
        entityId: approval.id,
        before: {
          status: existing.status.toLowerCase(),
          resolvedByUserId: existing.resolvedByUserId,
          resolvedAt: existing.resolvedAt?.toISOString() ?? null,
        },
        after: {
          status: approval.status.toLowerCase(),
          resolvedByUserId: approval.resolvedByUserId,
          resolvedAt: approval.resolvedAt?.toISOString() ?? null,
          resolutionNotes: approval.resolutionNotes,
        },
        metadata: {
          type: approval.type.toLowerCase(),
          requestedByUserId: approval.requestedByUserId,
          quoteItemId: approval.quoteItemId,
        },
      });

      return approval;
    });

    return NextResponse.json({ ok: true, approval: mapApproval(updated) });
  } catch (error) {
    console.error("Error resolving approval", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo resolver la autorización." },
      { status: 500 },
    );
  }
}
