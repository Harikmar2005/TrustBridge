import { env } from "../config/env";

export const SUPPORTED_TRANSLATION_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "hi",
  "ta",
  "zh",
  "ja",
  "ar",
  "pt",
] as const;

export type SupportedTranslationLanguage =
  (typeof SUPPORTED_TRANSLATION_LANGUAGES)[number];

export function isSupportedTranslationLanguage(
  language: string
): language is SupportedTranslationLanguage {
  const normalized = language.trim().toLowerCase();
  return (SUPPORTED_TRANSLATION_LANGUAGES as readonly string[]).includes(
    normalized
  );
}

export class UnsupportedTranslationLanguageError extends Error {
  constructor(language: string) {
    super(
      `Unsupported target language "${language}". Supported language codes: ${SUPPORTED_TRANSLATION_LANGUAGES.join(", ")}.`
    );
    this.name = "UnsupportedTranslationLanguageError";
  }
}

export interface TranslationResult {
  configured: boolean;
  provider: string;
  originalText: string;
  detectedLanguage: string | null;
  targetLanguage: string;
  translatedText: string | null;
  machineGenerated: boolean;
  notice: string;
}

export interface TranslationProvider {
  readonly name: string;
  isConfigured(): boolean;
  translate(
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult>;
}

function isValidHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

class LibreTranslateProvider implements TranslationProvider {
  readonly name = "libretranslate";

  isConfigured(): boolean {
    return (
      env.TRANSLATION_PROVIDER === "libretranslate" &&
      Boolean(env.TRANSLATION_API_URL) &&
      isValidHttpUrl(env.TRANSLATION_API_URL)
    );
  }

  async translate(
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    const normalizedLang = targetLanguage.trim().toLowerCase();
    if (!isSupportedTranslationLanguage(normalizedLang)) {
      throw new UnsupportedTranslationLanguageError(targetLanguage);
    }

    if (!this.isConfigured()) {
      return {
        configured: false,
        provider: "none",
        originalText: text,
        detectedLanguage: null,
        targetLanguage: normalizedLang,
        translatedText: null,
        machineGenerated: false,
        notice:
          "No external translation service is configured. Original message preserved.",
      };
    }

    const endpoint = `${env.TRANSLATION_API_URL.replace(/\/$/, "")}/translate`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "auto",
          target: normalizedLang,
          format: "text",
          ...(env.TRANSLATION_API_KEY
            ? { api_key: env.TRANSLATION_API_KEY }
            : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Translation provider returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        translatedText?: string;
        detectedLanguage?: { language?: string };
      };

      return {
        configured: true,
        provider: this.name,
        originalText: text,
        detectedLanguage: data.detectedLanguage?.language ?? null,
        targetLanguage: normalizedLang,
        translatedText: data.translatedText ?? null,
        machineGenerated: true,
        notice:
          "Machine-generated translation provided by configured translation engine. Always verify critical transaction terms against the original message.",
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

class UnconfiguredTranslationProvider implements TranslationProvider {
  readonly name = "unconfigured";

  isConfigured(): boolean {
    return false;
  }

  async translate(
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    const normalizedLang = targetLanguage.trim().toLowerCase();
    if (!isSupportedTranslationLanguage(normalizedLang)) {
      throw new UnsupportedTranslationLanguageError(targetLanguage);
    }

    return {
      configured: false,
      provider: "none",
      originalText: text,
      detectedLanguage: null,
      targetLanguage: normalizedLang,
      translatedText: null,
      machineGenerated: false,
      notice:
        "External translation provider is not configured (set TRANSLATION_PROVIDER=libretranslate and TRANSLATION_API_URL). Original message content is preserved without fabricated translation.",
    };
  }
}

export function getTranslationProvider(): TranslationProvider {
  if (
    env.TRANSLATION_PROVIDER === "libretranslate" &&
    env.TRANSLATION_API_URL &&
    isValidHttpUrl(env.TRANSLATION_API_URL)
  ) {
    return new LibreTranslateProvider();
  }
  return new UnconfiguredTranslationProvider();
}
