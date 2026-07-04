import { AuditAction } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const user = verifySessionToken(cookieStore.get(getSessionCookieName())?.value);

  if (user) {
    await prisma.auditLog
      .create({
        data: {
          actorUserId: user.id,
          action: AuditAction.LOGOUT,
          entityType: "user",
          entityId: user.id,
        },
      })
      .catch(() => undefined);
  }

  cookieStore.delete(getSessionCookieName());
  return NextResponse.json({ ok: true });
}
