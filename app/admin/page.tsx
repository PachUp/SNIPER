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
  if (!isAuthed()) {
    return (
      <AdminLogin
        loginFailed={searchParams?.error === "1"}
        passwordEnvSet={isAdminPasswordConfigured()}
      />
    );
  }
  return <AdminPanel />;
}
