import { NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAge,
  verifyPassword,
  type AuthUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    const email = payload?.email?.trim().toLowerCase() ?? "";
    const password = payload?.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Ingresa correo y contraseña." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.LOGIN_FAILED,
          entityType: "user",
          entityId: user?.id ?? null,
          metadata: { email },
        },
      });

      return NextResponse.json(
        { ok: false, error: "Correo o contraseña inválidos." },
        { status: 401 },
      );
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase() as AuthUser["role"],
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: AuditAction.LOGIN,
        entityType: "user",
        entityId: user.id,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), createSessionToken(authUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionMaxAge(),
    });

    return NextResponse.json({ ok: true, user: authUser });
  } catch (error) {
    console.error("Login error", error);

    return NextResponse.json(
      { ok: false, error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
