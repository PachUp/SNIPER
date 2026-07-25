import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Admin UI lives on the separate desk app (default http://localhost:3001). */
export default function AdminRedirectPage() {
  const desk =
    process.env.NEXT_PUBLIC_DESK_URL?.trim() || "http://localhost:3001";
  redirect(desk);
}
