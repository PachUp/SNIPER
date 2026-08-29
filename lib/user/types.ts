import type {
  BuiltPortfolio,
  PortfolioHolding,
} from "@/lib/types";

export type CloudReplaceRecord = {
  addedTicker: string;
  droppedOriginal?: string;
  droppedCurrent?: string;
};

/** Cloud mirror of guest localStorage portfolio state. */
export type CloudPortfolioPayload = {
  built: BuiltPortfolio | null;
  entries: Record<string, number>;
  entryDates: Record<string, string>;
  swaps: Record<string, string>;
  removed: string[];
  added: PortfolioHolding[];
  replaceStack: CloudReplaceRecord[];
  prefs: {
    entryCoachDismissed?: boolean;
    guestTrustDismissed?: boolean;
    displayName?: string;
  };
  updatedAt: string;
};

export function emptyCloudPayload(): CloudPortfolioPayload {
  return {
    built: null,
    entries: {},
    entryDates: {},
    swaps: {},
    removed: [],
    added: [],
    replaceStack: [],
    prefs: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export type AuthUser = {
  id: string;
  email: string;
  displayName?: string;
};
