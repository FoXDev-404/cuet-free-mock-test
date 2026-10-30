// Role-based access control for the Admin Studio.
// Roles are stored on User.role; the matrix is code to keep runtime queries out
// of the hot path (D1 free-plan CPU budget). ADMIN is the legacy role kept as an
// alias of SUPER_ADMIN so existing admin rows keep full control.

export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN", // legacy alias of SUPER_ADMIN
  "CONTENT_MANAGER",
  "REVIEWER",
  "TEST_MANAGER",
  "ANALYST",
] as const;

export type Role = (typeof ROLES)[number];

export function normalizeRole(role: string | undefined | null): Role | "USER" {
  if (!role) return "USER";
  const r = role.toUpperCase();
  return (ROLES as readonly string[]).includes(r) ? (r as Role) : "USER";
}

export function isAdminRole(role: string | undefined | null): boolean {
  return normalizeRole(role) !== "USER";
}

// Every grantable action. Modules group actions for compact UI checks.
export type AdminAction =
  // academic management
  | "ACADEMIC_READ"
  | "ACADEMIC_WRITE"
  // question bank
  | "QUESTION_READ"
  | "QUESTION_WRITE"
  | "QUESTION_PUBLISH" // publish / answer-key changes
  | "QUESTION_REVIEW" // review workspace approvals
  // mock tests
  | "TEST_READ"
  | "TEST_WRITE"
  | "TEST_PUBLISH"
  // students & attempts
  | "STUDENT_READ"
  | "STUDENT_WRITE"
  // leaderboards
  | "LEADERBOARD_READ"
  | "LEADERBOARD_CONFIG"
  | "LEADERBOARD_OVERRIDE"
  // imports
  | "IMPORT_RUN"
  | "IMPORT_READ"
  // analytics (read-only across students/attempts/questions)
  | "ANALYTICS_READ"
  // administration
  | "ADMIN_USERS"
  | "AUDIT_READ"
  | "SETTINGS_WRITE"
  | "DATABASE_TOOLS"
  // community & editorial moderation
  | "MODERATION_READ"
  | "MODERATION_WRITE"
  | "CONTENT_WRITE";

const MATRIX: Record<Role, readonly AdminAction[]> = {
  SUPER_ADMIN: [
    "ACADEMIC_READ", "ACADEMIC_WRITE",
    "QUESTION_READ", "QUESTION_WRITE", "QUESTION_PUBLISH", "QUESTION_REVIEW",
    "TEST_READ", "TEST_WRITE", "TEST_PUBLISH",
    "STUDENT_READ", "STUDENT_WRITE",
    "LEADERBOARD_READ", "LEADERBOARD_CONFIG", "LEADERBOARD_OVERRIDE",
    "IMPORT_RUN", "IMPORT_READ",
    "ANALYTICS_READ",
    "ADMIN_USERS", "AUDIT_READ", "SETTINGS_WRITE", "DATABASE_TOOLS",
    "MODERATION_READ", "MODERATION_WRITE", "CONTENT_WRITE",
  ],
  ADMIN: [
    "ACADEMIC_READ", "ACADEMIC_WRITE",
    "QUESTION_READ", "QUESTION_WRITE", "QUESTION_PUBLISH", "QUESTION_REVIEW",
    "TEST_READ", "TEST_WRITE", "TEST_PUBLISH",
    "STUDENT_READ", "STUDENT_WRITE",
    "LEADERBOARD_READ", "LEADERBOARD_CONFIG", "LEADERBOARD_OVERRIDE",
    "IMPORT_RUN", "IMPORT_READ",
    "ANALYTICS_READ",
    "ADMIN_USERS", "AUDIT_READ", "SETTINGS_WRITE", "DATABASE_TOOLS",
    "MODERATION_READ", "MODERATION_WRITE", "CONTENT_WRITE",
  ],
  CONTENT_MANAGER: [
    "ACADEMIC_READ", "ACADEMIC_WRITE",
    "QUESTION_READ", "QUESTION_WRITE", "QUESTION_PUBLISH",
    "TEST_READ", "TEST_WRITE", "TEST_PUBLISH",
    "IMPORT_RUN", "IMPORT_READ",
    "LEADERBOARD_READ",
    "ANALYTICS_READ", "STUDENT_READ",
    "MODERATION_READ", "CONTENT_WRITE",
  ],
  REVIEWER: [
    "ACADEMIC_READ",
    "QUESTION_READ", "QUESTION_REVIEW",
    "LEADERBOARD_READ", "ANALYTICS_READ", "STUDENT_READ",
    "MODERATION_READ", "MODERATION_WRITE",
  ],
  TEST_MANAGER: [
    "ACADEMIC_READ",
    "QUESTION_READ",
    "TEST_READ", "TEST_WRITE", "TEST_PUBLISH",
    "LEADERBOARD_READ", "LEADERBOARD_CONFIG",
    "ANALYTICS_READ", "STUDENT_READ",
  ],
  ANALYST: [
    "ACADEMIC_READ", "QUESTION_READ", "TEST_READ",
    "STUDENT_READ", "LEADERBOARD_READ", "ANALYTICS_READ", "AUDIT_READ",
  ],
};

export function can(role: string | undefined | null, action: AdminAction): boolean {
  const r = normalizeRole(role);
  if (r === "USER") return false;
  return MATRIX[r].includes(action);
}

export function actionsFor(role: string | undefined | null): readonly AdminAction[] {
  const r = normalizeRole(role);
  return r === "USER" ? [] : MATRIX[r];
}
