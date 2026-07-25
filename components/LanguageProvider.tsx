"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type Lang,
  dirFor,
  riskLabel,
  sectorLabel,
  timeAgo,
  tr,
} from "@/lib/i18n";

const LANG_KEY = "sniper.lang";

type I18nValue = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  sector: (name: string) => string;
  risk: (beta: number) => string;
  ago: (iso: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved === "en" || saved === "he") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir: dirFor(lang),
      setLang,
      toggle: () => setLang(lang === "en" ? "he" : "en"),
      t: (key, vars) => tr(lang, key, vars),
      sector: (name) => sectorLabel(lang, name),
      risk: (beta) => riskLabel(lang, beta),
      ago: (iso) => timeAgo(lang, iso),
    }),
    [lang, setLang]
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
