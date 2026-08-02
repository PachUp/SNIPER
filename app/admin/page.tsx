import { isAuthed } from "@/lib/auth";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

/** Unified admin desk — same origin as SNIPER, behind ADMIN link. */
export default function AdminPage() {
  if (!isAuthed()) {
    return <AdminLogin />;
  }
  return <AdminPanel />;
}
