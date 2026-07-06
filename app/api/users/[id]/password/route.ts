import { NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/serverAuth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const payload = (await request.json().catch(() => null)) as { password?: unknown } | null;
    const password = typeof payload?.password === "string" ? payload.password : "";

    if (password.length < 10) {
      return NextResponse.json(
        { ok: false, error: "La contraseña temporal debe tener al menos 10 caracteres." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash: hashPassword(password) },
        select: { id: true },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.user.id,
        action: AuditAction.PASSWORD_RESET,
        entityType: "user",
        entityId: id,
        metadata: {
          targetEmail: existing.email,
          targetName: existing.name,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error resetting user password", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo resetear la contraseña." },
      { status: 500 },
    );
  }
}
