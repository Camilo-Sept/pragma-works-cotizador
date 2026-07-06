import { NextResponse } from "next/server";
import { AuditAction, Prisma, UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forbiddenResponse, requireRole } from "@/lib/serverAuth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

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

function bool(value: unknown) {
  return value === true;
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeRole(value: unknown) {
  if (typeof value !== "string") return UserRole.VENTAS;
  return roleMap[value.trim().toLowerCase()] ?? UserRole.VENTAS;
}

export async function GET() {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ ok: true, users: users.map(mapUser) });
  } catch (error) {
    console.error("Error loading users", error);

    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar los usuarios." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    const email = normalizeEmail(payload?.email);
    const password = typeof payload?.password === "string" ? payload.password : "";
    const role = normalizeRole(payload?.role);

    if (!name || !email || !password) {
      return NextResponse.json(
        { ok: false, error: "Nombre, correo y contraseña temporal son obligatorios." },
        { status: 400 },
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { ok: false, error: "La contraseña temporal debe tener al menos 10 caracteres." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un usuario con ese correo." },
        { status: 409 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          active: true,
          canApproveDiscountsOver10: bool(payload?.canApproveDiscountsOver10),
          canApprovePriceChanges: bool(payload?.canApprovePriceChanges),
          canApproveManualPricedItems: bool(payload?.canApproveManualPricedItems),
          canApproveCatalogPriceChanges: bool(payload?.canApproveCatalogPriceChanges),
          canViewAuditLogs: bool(payload?.canViewAuditLogs),
          canExportAuditLogs: bool(payload?.canExportAuditLogs),
        },
        select: userSelect,
      });

      await writeAuditLog(tx, {
        actorUserId: auth.user.id,
        action: AuditAction.USER_CREATE,
        entityType: "user",
        entityId: user.id,
        after: {
          name: user.name,
          email: user.email,
          role: user.role.toLowerCase(),
          active: user.active,
        },
      });

      return user;
    });

    return NextResponse.json({ ok: true, user: mapUser(created) }, { status: 201 });
  } catch (error) {
    console.error("Error creating user", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo crear el usuario." },
      { status: 500 },
    );
  }
}
