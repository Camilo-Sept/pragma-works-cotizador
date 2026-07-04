import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import type { UserRole } from "@/types/quote";

const SESSION_COOKIE_NAME = "pragma_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const HASH_ITERATIONS = 120_000;
const HASH_KEY_LENGTH = 32;
const HASH_DIGEST = "sha256";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type SessionPayload = AuthUser & {
  exp: number;
};

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAge() {
  return SESSION_DURATION_SECONDS;
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || "pragma-works-dev-secret-change-me";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST).toString("base64url");
  return `pbkdf2$${HASH_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [algorithm, iterationsText, salt, hash] = storedHash.split("$");
  if (algorithm !== "pbkdf2" || !iterationsText || !salt || !hash) return false;

  const iterations = Number(iterationsText);
  if (!Number.isFinite(iterations)) return false;

  const attempted = pbkdf2Sync(password, salt, iterations, HASH_KEY_LENGTH, HASH_DIGEST);
  const expected = Buffer.from(hash, "base64url");

  if (attempted.length !== expected.length) return false;
  return timingSafeEqual(attempted, expected);
}

export function createSessionToken(user: AuthUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload.id || !payload.email || !payload.role || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    } satisfies AuthUser;
  } catch {
    return null;
  }
}
