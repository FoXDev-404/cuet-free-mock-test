import { createAdmin } from "../../scripts/create-admin";
import { prisma } from "../../src/lib/prisma";

// Test admin credentials — used by the login/admin E2E tests.
// Kept in sync with tests/e2e/admin.spec.ts.
export const E2E_ADMIN = {
  email: "admin@test.local",
  password: "TestAdmin123!",
  name: "E2E Admin",
};

export default async function globalSetup() {
  if (process.env.CI) return; // CI provisions its own admin
  await createAdmin({ ...E2E_ADMIN });
  await prisma.$disconnect();
}
