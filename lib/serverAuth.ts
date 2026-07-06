import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken, type AuthUser } from "@/lib/auth";
import type { UserRole } from "@/types/quote";

export type AuthGuardResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(getSessionCookieName())?.value);
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
