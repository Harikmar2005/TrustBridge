import { env } from "../config/env";

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

class LibreTranslateProvider implements TranslationProvider {
  readonly name = "libretranslate";

  isConfigured(): boolean {
    return (
      env.TRANSLATION_PROVIDER === "libretranslate" &&
      Boolean(env.TRANSLATION_API_URL)
    );
  }

  async translate(
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        provider: "none",
        originalText: text,
        detectedLanguage: null,
        targetLanguage,
        translatedText: null,
        machineGenerated: false,
        notice:
          "No external translation service is configured. Original message preserved.",
      };
    }

    const endpoint = `${env.TRANSLATION_API_URL.replace(/\/$/, "")}/translate`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLanguage,
        format: "text",
        ...(env.TRANSLATION_API_KEY
          ? { api_key: env.TRANSLATION_API_KEY }
          : {}),
      }),
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
      targetLanguage,
      translatedText: data.translatedText ?? null,
      machineGenerated: true,
      notice:
        "Machine-generated translation provided by configured translation engine. Always verify critical transaction terms against the original message.",
    };
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
    return {
      configured: false,
      provider: "none",
      originalText: text,
      detectedLanguage: null,
      targetLanguage,
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
    env.TRANSLATION_API_URL
  ) {
    return new LibreTranslateProvider();
  }
  return new UnconfiguredTranslationProvider();
}
