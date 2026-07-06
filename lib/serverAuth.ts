import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken, type AuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types/quote";

export type AuthGuardResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionUser = verifySessionToken(cookieStore.get(getSessionCookieName())?.value);

  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });

  if (!user?.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase() as AuthUser["role"],
  } satisfies AuthUser;
}

export function unauthorizedResponse(message = "Sesión requerida.") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 401 },
  );
}

export function forbiddenResponse(message = "Tu rol no tiene permiso para esta acción.") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 403 },
  );
}

export async function requireAuth(): Promise<AuthGuardResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  return { ok: true, user };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthGuardResult> {
  const auth = await requireAuth();

  if (!auth.ok) {
    return auth;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return auth;
}

export function hasRole(user: AuthUser, allowedRoles: UserRole[]) {
  return allowedRoles.includes(user.role);
}
