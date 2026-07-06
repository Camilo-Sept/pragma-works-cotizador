import { NextResponse } from "next/server";
import { AuditAction, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { forbiddenResponse, requireAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const actionMap = Object.fromEntries(
  Object.values(AuditAction).map((action) => [action.toLowerCase(), action]),
) as Record<string, AuditAction>;

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

function mapLog(log: Prisma.AuditLogGetPayload<{ include: { actor: true; quote: true } }>) {
  return {
    id: log.id,
    actorUserId: log.actorUserId,
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.name,
          email: log.actor.email,
          role: log.actor.role.toLowerCase(),
        }
      : null,
    quoteId: log.quoteId,
    quote: log.quote
      ? {
          id: log.quote.id,
          folio: log.quote.folio,
        }
      : null,
    action: log.action.toLowerCase(),
    entityType: log.entityType,
    entityId: log.entityId,
    before: log.before,
    after: log.after,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  };
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
        canViewAuditLogs: true,
      },
    });

    if (!currentUser?.active) {
      return forbiddenResponse("Tu usuario no está activo.");
    }

    const canView = currentUser.role === UserRole.ADMIN || currentUser.canViewAuditLogs;
    if (!canView) {
      return forbiddenResponse("No tienes permiso para ver la bitácora.");
    }

    const url = new URL(request.url);
    const actorUserId = url.searchParams.get("actorUserId")?.trim();
    const entityType = url.searchParams.get("entityType")?.trim();
    const entityId = url.searchParams.get("entityId")?.trim();
    const quoteId = url.searchParams.get("quoteId")?.trim();
    const q = url.searchParams.get("q")?.trim();
    const actionText = url.searchParams.get("action")?.trim().toLowerCase();
    const action = actionText ? actionMap[actionText] : undefined;
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));
    const take = parseTake(url.searchParams.get("take"));

    const where: Prisma.AuditLogWhereInput = {};

    if (actorUserId) where.actorUserId = actorUserId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (quoteId) where.quoteId = quoteId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {
        gte: from,
        lte: to,
      };
    }

    if (q) {
      where.OR = [
        { entityType: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { actor: { is: { name: { contains: q, mode: "insensitive" } } } },
        { actor: { is: { email: { contains: q, mode: "insensitive" } } } },
        { quote: { is: { folio: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: true,
        quote: true,
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({ ok: true, logs: logs.map(mapLog) });
  } catch (error) {
    console.error("Error loading audit logs", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo cargar la bitácora." },
      { status: 500 },
    );
  }
}
