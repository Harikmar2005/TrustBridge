import type {
  ChatMessage,
  ConversationSummary,
  SellerProfile,
  UserRole,
} from "@shared/types";

export type { ChatMessage, ConversationSummary, SellerProfile, UserRole };

export interface TranslationOutput {
  configured: boolean;
  provider: string;
  originalText: string;
  detectedLanguage?: string | null;
  targetLanguage: string;
  translatedText: string | null;
  machineGenerated: boolean;
  notice: string;
}
