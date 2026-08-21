import { isAuthed, isAdminPasswordConfigured } from "@/lib/auth";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Unified admin desk — same origin as SNIPER, behind ADMIN link. */
export default function AdminPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const buildStamp = (
    process.env["COMMIT_REF"] ||
    process.env["VERCEL_GIT_COMMIT_SHA"] ||
    "local"
  ).slice(0, 7);

  if (!isAuthed()) {
    return (
      <AdminLogin
        loginFailed={searchParams?.error === "1"}
        passwordEnvSet={isAdminPasswordConfigured()}
        buildStamp={buildStamp}
      />
    );
  }
  return <AdminPanel />;
}
