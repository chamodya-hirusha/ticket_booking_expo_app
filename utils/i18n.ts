// ─── Types ───────────────────────────────────────────────────────────────────

export type SupportedLanguage = "EN" | "IT" | "FR" | "SG";

/** All valid language codes as a Set for O(1) validation. */
const SUPPORTED_SET = new Set<SupportedLanguage>(["EN", "IT", "FR", "SG"]);

const isSupportedLanguage = (v: unknown): v is SupportedLanguage =>
  typeof v === "string" && SUPPORTED_SET.has(v as SupportedLanguage);

// ─── Dictionaries ─────────────────────────────────────────────────────────────

import en from "@/locales/en.json";
import it from "@/locales/it.json";
import fr from "@/locales/fr.json";
import sg from "@/locales/sg.json";

export const dictionaries: Record<SupportedLanguage, typeof en> = {
  EN: en,
  IT: it,
  FR: fr,
  SG: sg,
};

/**
 * Returns the dictionary for the given language code.
 * Falls back to English if the language is not supported.
 */
export const getDictionary = (lang: string): typeof en => {
  const key = lang.toUpperCase() as SupportedLanguage;
  return dictionaries[key] ?? dictionaries.EN;
};

// ─── localStorage Cache ───────────────────────────────────────────────────────

const CACHE_KEY = "user_lang";

/** SSR-safe: returns true only when running in a browser. */
const isBrowser = () => typeof window !== "undefined";

/** Read the cached language from localStorage. Returns null if missing/invalid/SSR. */
const readCache = (): SupportedLanguage | null => {
  if (!isBrowser()) return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return isSupportedLanguage(cached) ? cached : null;
  } catch {
    return null; // private browsing / storage quota
  }
};

/** Write the detected language to localStorage. No-op during SSR or on error. */
const writeCache = (lang: SupportedLanguage): void => {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CACHE_KEY, lang);
  } catch {
    // storage unavailable — silently ignore
  }
};

/** Manually clear the cached language (e.g. on logout or language reset). */
export const clearLanguageCache = (): void => {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
};

// ─── Browser Language Detection ───────────────────────────────────────────────

/**
 * Maps a BCP-47 browser language tag to a SupportedLanguage.
 *
 *   "en*"   → EN
 *   "it*"   → IT
 *   "fr*"   → FR
 *   "de-CH" → SG  (Swiss German)
 *   "de*"   → SG  (other German → Swiss German)
 *   *       → null (unsupported — triggers IP fallback)
 */
export const mapBrowserLanguage = (
  browserLang: string
): SupportedLanguage | null => {
  const lang = browserLang.toLowerCase();

  if (lang.startsWith("en")) return "EN";
  if (lang.startsWith("it")) return "IT";
  if (lang.startsWith("fr")) return "FR";
  if (lang === "de-ch" || lang.startsWith("de")) return "SG";

  return null; // unsupported — let caller decide the fallback
};

/**
 * Reads the browser's preferred language list (SSR-safe).
 * Returns null when running on the server or when the language is unsupported.
 */
export const getUserLanguageFromBrowser = (): SupportedLanguage | null => {
  if (!isBrowser()) return null;

  const langs = navigator.languages?.length
    ? Array.from(navigator.languages)
    : [navigator.language];

  for (const tag of langs) {
    const mapped = mapBrowserLanguage(tag);
    if (mapped) return mapped; // return first supported match
  }

  return null; // none of the browser languages are supported
};

// ─── IP-based Country Detection ───────────────────────────────────────────────

/** Country code → SupportedLanguage. Extend freely. */
const COUNTRY_TO_LANG: Record<string, SupportedLanguage> = {
  // Swiss German
  CH: "SG",
  LI: "SG", // Liechtenstein
  // Italian
  IT: "IT",
  SM: "IT", // San Marino
  VA: "IT", // Vatican
  // French
  FR: "FR",
  BE: "FR", // Belgium
  MC: "FR", // Monaco
  LU: "FR", // Luxembourg
  // English
  GB: "EN", US: "EN", AU: "EN",
  CA: "EN", NZ: "EN", IE: "EN",
};

interface IpApiResponse {
  country_code?: string; // "CH", "IT", …
  languages?: string;    // "de-ch,fr,it"
  error?: boolean;
  reason?: string;
}

/**
 * Calls ipapi.co to detect the user's country.
 * Returns null on any failure (network error, timeout, rate-limit, …).
 *
 * ipapi.co Free plan: 30,000 requests/month (~1,000/day).
 * With localStorage caching this is almost never called after the first visit.
 */
export const getUserLanguageFromIP = async (
  timeoutMs = 4000
): Promise<SupportedLanguage | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
      // Prevent caching at the network level so we always get fresh country data
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const data: IpApiResponse = await res.json();

    if (data.error) {
      console.warn("[i18n] ipapi.co error:", data.reason);
      return null;
    }

    const country = data.country_code?.toUpperCase();

    // 1. Direct country → language lookup
    if (country && COUNTRY_TO_LANG[country]) {
      return COUNTRY_TO_LANG[country];
    }

    // 2. Fallback: use the first language tag in the country's language list
    if (data.languages) {
      const firstTag = data.languages.split(",")[0].trim();
      return mapBrowserLanguage(firstTag); // already returns null for unsupported
    }

    return null;
  } catch {
    return null; // AbortError (timeout) or any network failure
  }
};

// ─── getUserLanguage — public API ─────────────────────────────────────────────

/**
 * Resolves the user's language with the following priority:
 *
 *   1. 💾 localStorage cache   — instant, zero network  (skips all detection)
 *   2. 🖥️  Browser language    — instant, synchronous   (no API call needed)
 *   3. 🌐 IP geo (ipapi.co)   — async, only when #1 and #2 both fail
 *   4. 🇬🇧 English            — ultimate fallback
 *
 * The resolved language is written back to localStorage so subsequent calls
 * skip steps 2–4 entirely.
 *
 * @example
 * const lang = await getUserLanguage();   // "EN" | "IT" | "FR" | "SG"
 * const dict = getDictionary(lang);
 */
export const getUserLanguage = async (): Promise<SupportedLanguage> => {
  // ① Cache hit — fastest path, no detection needed
  const cached = readCache();
  if (cached) return cached;

  // ② Browser language — synchronous, instant
  const browserLang = getUserLanguageFromBrowser();
  if (browserLang) {
    writeCache(browserLang);
    return browserLang;
  }

  // ③ IP geo — only reaches here when browser lang is unsupported (e.g. "zh", "ar")
  const ipLang = await getUserLanguageFromIP();
  if (ipLang) {
    writeCache(ipLang);
    return ipLang;
  }

  // ④ Ultimate fallback
  writeCache("EN");
  return "EN";
};



