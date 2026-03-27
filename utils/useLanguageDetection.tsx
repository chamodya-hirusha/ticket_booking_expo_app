 "use client"; // Next.js App Router: client-side only

import { useState, useEffect, useCallback } from "react";
import {
  SupportedLanguage,
  getDictionary,
  getUserLanguage,
  getUserLanguageFromBrowser,
  clearLanguageCache,
} from "./i18n";

export type { SupportedLanguage };

// ─── Language metadata ────────────────────────────────────────────────────────

export const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: "EN", label: "English",          flag: "🇬🇧" },
  { code: "IT", label: "Italiano",         flag: "🇮🇹" },
  { code: "FR", label: "Français",         flag: "🇫🇷" },
  { code: "SG", label: "Schwiizerdütsch",  flag: "🇨🇭" },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLanguageResult {
  /** Currently active language code */
  lang: SupportedLanguage;
  /** Full dictionary for the active language */
  dict: ReturnType<typeof getDictionary>;
  /**
   * Translate a dot-notation key.
   * @example t("profile.title") // "My Profile" | "Il Mio Profilo" | …
   */
  t: (key: string) => string;
  /** True while the async IP geo-detection is still running */
  isDetecting: boolean;
  /** Manually override the language and persist to localStorage */
  setLang: (lang: SupportedLanguage) => void;
  /** Clear the localStorage cache and re-run detection */
  resetLang: () => void;
}

/**
 * useLanguageDetection
 *
 * Detection waterfall (fastest → most accurate):
 *   1. 💾 localStorage cache    — instant, zero network (skips all steps below)
 *   2. 🖥️  Browser language     — instant, synchronous (no API call)
 *   3. 🌐 IP geo (ipapi.co)    — async, only when browser lang is unsupported
 *   4. 🇬🇧 English              — ultimate fallback
 *
 * @example
 * const { t, lang, setLang, isDetecting } = useLanguageDetection();
 * <h1>{t("home.welcome")}</h1>
 */
export function useLanguageDetection(): UseLanguageResult {
  // ① Immediately render with browser language (SSR returns "EN")
  const [lang, setLangState] = useState<SupportedLanguage>(
    () => getUserLanguageFromBrowser() ?? "EN"
  );
  const [isDetecting, setIsDetecting] = useState(true);

  const runDetection = useCallback(async () => {
    setIsDetecting(true);
    const detected = await getUserLanguage(); // cache → browser → IP → EN
    setLangState(detected);
    setIsDetecting(false);
  }, []);

  // Run full detection (cache-aware) on mount
  useEffect(() => {
    runDetection();
  }, [runDetection]);

  /** Manually switch language + persist to localStorage */
  const setLang = useCallback((newLang: SupportedLanguage) => {
    try {
      localStorage.setItem("user_lang", newLang);
    } catch { /* storage unavailable */ }
    setLangState(newLang);
  }, []);

  /** Clear cache and re-detect */
  const resetLang = useCallback(() => {
    clearLanguageCache();
    runDetection();
  }, [runDetection]);

  const dict = getDictionary(lang);

  /** Resolve a dot-notation key with English fallback */
  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");

      const resolve = (obj: unknown): string | null => {
        let node = obj;
        for (const k of keys) {
          if (node && typeof node === "object" && k in (node as object)) {
            node = (node as Record<string, unknown>)[k];
          } else {
            return null;
          }
        }
        return typeof node === "string" ? node : null;
      };

      return (
        resolve(dict) ??
        resolve(getDictionary("EN")) ??
        key // last resort: return the key itself
      );
    },
    [dict]
  );

  return { lang, dict, t, isDetecting, setLang, resetLang };
}

// ─── Example Next.js Component ───────────────────────────────────────────────

/**
 * LanguageSwitcher
 *
 * Ready-to-use component: shows detected language, allows manual override.
 * Import and drop anywhere in your Next.js app:
 *
 * @example
 * import { LanguageSwitcher } from "@/utils/useLanguageDetection";
 * export default function Page() { return <LanguageSwitcher />; }
 */
export function LanguageSwitcher() {
  const { lang, setLang, t, isDetecting, resetLang } = useLanguageDetection();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 480 }}>
      <h2 style={{ marginBottom: 4 }}>{t("settings.language")}</h2>

      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        {isDetecting
          ? "⏳ Detecting your location…"
          : `✅ Detected: ${LANGUAGES.find((l) => l.code === lang)?.label ?? lang}`}
      </p>

      {/* Language buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {LANGUAGES.map((l) => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                border: `2px solid ${active ? "#6366f1" : "#e5e7eb"}`,
                background: active ? "#6366f1" : "#fff",
                color: active ? "#fff" : "#374151",
                cursor: "pointer",
                fontWeight: active ? 700 : 400,
                fontSize: 14,
                transition: "all 0.15s",
              }}
            >
              {l.flag} {l.label}
            </button>
          );
        })}
      </div>

      {/* Live translation preview */}
      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 12,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          fontSize: 14,
          lineHeight: 1.8,
        }}
      >
        <strong>Live preview ({lang}):</strong>
        <table style={{ marginTop: 8, borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {[
              "home.welcome",
              "profile.title",
              "common.logout",
              "auth.signIn",
              "tickets.title",
              "settings.selectLanguage",
            ].map((k) => (
              <tr key={k}>
                <td style={{ color: "#6b7280", padding: "2px 12px 2px 0", whiteSpace: "nowrap" }}>
                  <code style={{ fontSize: 12 }}>{k}</code>
                </td>
                <td style={{ color: "#111827", fontWeight: 500 }}>{t(k)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset cache */}
      <button
        onClick={resetLang}
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "#6b7280",
          background: "none",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline",
          padding: 0,
        }}
      >
        Reset cache &amp; re-detect
      </button>
    </div>
  );
}
