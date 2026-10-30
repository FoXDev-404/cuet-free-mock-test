import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

// Create or refresh an ADMIN user from env vars (ADMIN_EMAIL / ADMIN_PASSWORD).
// - Local: run `npx tsx scripts/create-admin.ts <email> <password>` (uses .env DATABASE_URL)
// - Production (D1): run locally WITHOUT ADMIN_EMAIL to print a hash for the
//   given password, then insert via `wrangler d1 execute --remote`.
//   Passwords use the WebCrypto PBKDF2 scheme from src/lib/auth/password.ts
//   (bcrypt is unusable inside the free Workers 10ms CPU budget).

interface Options {
  email: string;
  password: string;
  name?: string;
}

export function parseArgs(): Options | { hashOnly: string } {
  const [emailArg, passwordArg] = process.argv.slice(2);
  if (emailArg === "--hash-only") {
    return { hashOnly: passwordArg ?? "" };
  }
  const email = emailArg || process.env.ADMIN_EMAIL || "";
  const password = passwordArg || process.env.ADMIN_PASSWORD || "";
  return { email, password };
}

export async function createAdmin({ email, password, name = "Admin" }: Options) {
  if (!email || !password || password.length < 8) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters) must be provided (env or args)."
    );
  }
  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash, role: "ADMIN", name },
    });
    console.log(`✅ Admin refreshed: ${email}`);
  } else {
    await prisma.user.create({
      data: { email, name, role: "ADMIN", passwordHash },
    });
    console.log(`✅ Admin created: ${email}`);
  }
}

const arg = parseArgs();

if ("hashOnly" in arg) {
  if (!arg.hashOnly) throw new Error("Usage: tsx scripts/create-admin.ts --hash-only <password>");
  hashPassword(arg.hashOnly)
    .then((hash) => console.log(hash));
} else if (process.argv[1] && process.argv[1].endsWith("create-admin.ts")) {
  createAdmin(arg)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
