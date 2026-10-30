import LoginForm from "./login-form";

type LoginSearchParams = { [key: string]: string | string[] | undefined };

function sanitizeCallbackUrl(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Only allow in-app destinations; avoids ?callbackUrl=//evil.com redirects.
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const callbackUrl = sanitizeCallbackUrl((await searchParams).callbackUrl);
  return <LoginForm callbackUrl={callbackUrl} />;
}
