import { cookies } from "next/headers";

const COOKIE_PREFIX = "cuet_attempt_";
const TOKEN_TTL_SEC = 6 * 60 * 60;

function secret(): string {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-guest-attempt-secret"
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Signed, attempt-scoped token for guests who have no account. */
export async function createGuestToken(attemptId: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const payload = `${attemptId}.${expires}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyGuestToken(
  attemptId: string,
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenAttemptId, expiresRaw, signature] = parts;
  if (tokenAttemptId !== attemptId) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      fromBase64Url(signature),
      new TextEncoder().encode(`${tokenAttemptId}.${expiresRaw}`),
    );
    return valid;
  } catch {
    return false;
  }
}

export function guestCookieName(attemptId: string): string {
  return `${COOKIE_PREFIX}${attemptId}`;
}

export async function setGuestAttemptCookie(attemptId: string): Promise<void> {
  const store = await cookies();
  store.set(guestCookieName(attemptId), await createGuestToken(attemptId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SEC,
  });
}

export async function clearGuestAttemptCookie(attemptId: string): Promise<void> {
  const store = await cookies();
  store.delete(guestCookieName(attemptId));
}

/** True when the request carries the signed cookie issued at attempt start. */
export async function hasGuestAttemptAccess(attemptId: string): Promise<boolean> {
  const store = await cookies();
  return verifyGuestToken(attemptId, store.get(guestCookieName(attemptId))?.value);
}
