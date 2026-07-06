import { NextResponse } from "next/server";
import { AuditAction, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/serverAuth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  lastLoginAt: true,
  canApproveDiscountsOver10: true,
  canApprovePriceChanges: true,
  canApproveManualPricedItems: true,
  canApproveCatalogPriceChanges: true,
  canViewAuditLogs: true,
  canExportAuditLogs: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type SafeUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function mapUser(user: SafeUser) {
  return {
    ...user,
    role: user.role.toLowerCase(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const payload = (await request.json().catch(() => null)) as { active?: unknown } | null;
    const nextActive = payload?.active;

    if (typeof nextActive !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "El campo active debe ser booleano." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    if (auth.user.id === id && nextActive === false) {
      return NextResponse.json(
        { ok: false, error: "No puedes desactivar tu propia cuenta." },
        { status: 400 },
      );
    }

    if (existing.role === UserRole.ADMIN && existing.active && nextActive === false) {
      const activeAdminCount = await prisma.user.count({
        where: { role: UserRole.ADMIN, active: true },
      });

      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { ok: false, error: "No puedes dejar el sistema sin administradores activos." },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { active: nextActive },
        select: userSelect,
      });

      await writeAuditLog(tx, {
        actorUserId: auth.user.id,
        action: nextActive ? AuditAction.USER_ENABLE : AuditAction.USER_DISABLE,
        entityType: "user",
        entityId: id,
        before: mapUser(existing),
        after: mapUser(user),
      });

      return user;
    });

    return NextResponse.json({ ok: true, user: mapUser(updated) });
  } catch (error) {
    console.error("Error updating user active status", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo cambiar el estado del usuario." },
      { status: 500 },
    );
  }
}
