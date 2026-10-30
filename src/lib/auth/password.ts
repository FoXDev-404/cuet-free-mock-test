/**
 * Password hashing for the Workers (free-plan) runtime.
 *
 * bcrypt is pure JavaScript and costs ~300ms of CPU per comparison — against
 * the free Workers plan's hard ~10ms/request CPU budget it is unrunnable and
 * killed with 1102. WebCrypto's PBKDF2 runs in the runtime's native code:
 *
 *   default iterations ≈ 4-15k ≈ 0.5-2ms measured on Workers.
 *
 * The iteration count is stored in the hash string, so hashes can be
 * re-issued with a higher work factor (e.g. AUTH_PBKDF2_ITERATIONS=310000)
 * once the app runs on a paid plan without the 10ms cap.
 *
 * Format: pbkdf2$<iterations>$<salt-base64url>$<hash-base64url>
 */
const SCHEME = "pbkdf2";
const DEFAULT_ITERATIONS = 2048;
const SALT_BYTES = 16;
const BITS = 256;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** A freed ArrayBuffer copy that satisfies WebCrypto's BufferSource typing. */
function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    asBufferSource(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: asBufferSource(salt), iterations },
    key,
    BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const iterations = Number(process.env.AUTH_PBKDF2_ITERATIONS) || DEFAULT_ITERATIONS;
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return `${SCHEME}$${iterations}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== SCHEME) {
    // Unknown/legacy scheme (old bcrypt rows): rejected rather than guessed.
    console.error(`Unsupported password hash scheme "${parts[0] ?? ""}"; re-hash the user.`);
    return false;
  }
  const iterations = Number.parseInt(parts[1]!, 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = fromBase64Url(parts[2]!);
  const expected = fromBase64Url(parts[3]!);
  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
