import { NextResponse } from "next/server";
import { AuditAction, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/serverAuth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const roleMap: Record<string, UserRole> = {
  admin: UserRole.ADMIN,
  supervisor: UserRole.SUPERVISOR,
  ventas: UserRole.VENTAS,
  operacion: UserRole.OPERACION,
  lectura: UserRole.LECTURA,
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

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

function normalizeRole(value: unknown) {
  if (typeof value !== "string") return undefined;
  return roleMap[value.trim().toLowerCase()];
}

function boolOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

async function wouldRemoveLastActiveAdmin(userId: string, nextRole?: UserRole) {
  if (nextRole === undefined || nextRole === UserRole.ADMIN) return false;

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, active: true },
  });

  if (!current || current.role !== UserRole.ADMIN || !current.active) return false;

  const activeAdminCount = await prisma.user.count({
    where: { role: UserRole.ADMIN, active: true },
  });

  return activeAdminCount <= 1;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido." },
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

    const name = typeof payload.name === "string" ? payload.name.trim() : undefined;
    const email = normalizeEmail(payload.email);
    const role = normalizeRole(payload.role);

    if (name === "" || email === "") {
      return NextResponse.json(
        { ok: false, error: "Nombre y correo no pueden quedar vacíos." },
        { status: 400 },
      );
    }

    if (payload.role !== undefined && !role) {
      return NextResponse.json(
        { ok: false, error: "Rol inválido." },
        { status: 400 },
      );
    }

    if (auth.user.id === id && role && role !== UserRole.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "No puedes quitarte tu propio rol admin." },
        { status: 400 },
      );
    }

    if (await wouldRemoveLastActiveAdmin(id, role)) {
      return NextResponse.json(
        { ok: false, error: "No puedes dejar el sistema sin administradores activos." },
        { status: 400 },
      );
    }

    if (email && email !== existing.email) {
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner) {
        return NextResponse.json(
          { ok: false, error: "Ya existe otro usuario con ese correo." },
          { status: 409 },
        );
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;

    const permissionFields = [
      "canApproveDiscountsOver10",
      "canApprovePriceChanges",
      "canApproveManualPricedItems",
      "canApproveCatalogPriceChanges",
      "canViewAuditLogs",
      "canExportAuditLogs",
    ] as const;

    for (const field of permissionFields) {
      const value = boolOrUndefined(payload[field]);
      if (value !== undefined) {
        data[field] = value;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
        select: userSelect,
      });

      await writeAuditLog(tx, {
        actorUserId: auth.user.id,
        action: AuditAction.USER_UPDATE,
        entityType: "user",
        entityId: id,
        before: mapUser(existing),
        after: mapUser(user),
      });

      return user;
    });

    return NextResponse.json({ ok: true, user: mapUser(updated) });
  } catch (error) {
    console.error("Error updating user", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el usuario." },
      { status: 500 },
    );
  }
}
