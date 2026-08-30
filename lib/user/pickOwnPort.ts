import type { CloudPortfolioPayload } from "@/lib/user/types";
import {
  normalizeNameKey,
  payloadHasBook,
} from "@/lib/user/namedVault";

function ts(p: CloudPortfolioPayload): number {
  return Date.parse(p.updatedAt || "") || 0;
}

function labeledName(payload: CloudPortfolioPayload): string | null {
  const d = payload.prefs?.displayName?.trim();
  return d ? d : null;
}

/**
 * This person’s port only. Skip a working book labeled with a different name.
 * Cloud is already scoped to the session. Vault is keyed by name.
 */
export function pickOwnPort(opts: {
  name: string;
  vault: CloudPortfolioPayload | null | undefined;
  cloud: CloudPortfolioPayload | null | undefined;
  local: CloudPortfolioPayload | null | undefined;
}): CloudPortfolioPayload | null {
  const { name, vault, cloud, local } = opts;
  type Cand = { t: number; rank: number; p: CloudPortfolioPayload };
  const cands: Cand[] = [];
  const key = normalizeNameKey(name);

  if (payloadHasBook(cloud) && cloud) {
    cands.push({ t: ts(cloud), rank: 3, p: cloud });
  }
  if (payloadHasBook(vault) && vault) {
    cands.push({ t: ts(vault), rank: 2, p: vault });
  }
  if (payloadHasBook(local) && local) {
    const label = labeledName(local);
    const other =
      label != null && normalizeNameKey(label) !== key;
    if (!other) {
      cands.push({ t: ts(local), rank: 1, p: local });
    }
  }

  if (cands.length === 0) return null;
  cands.sort((a, b) => (b.t !== a.t ? b.t - a.t : b.rank - a.rank));
  return cands[0].p;
}
