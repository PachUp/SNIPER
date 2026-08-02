"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { riskLabel, sectorLabel, timeAgo, tr } from "@/lib/i18n";

type I18nValue = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  sector: (name: string) => string;
  risk: (beta: number) => string;
  ago: (iso: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

const LANG_KEY = "sniper.lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.removeItem(LANG_KEY);
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      t: (key, vars) => tr(key, vars),
      sector: (name) => sectorLabel(name),
      risk: (beta) => riskLabel(beta),
      ago: (iso) => timeAgo(iso),
    }),
    []
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
}
