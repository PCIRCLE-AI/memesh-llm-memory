/**
 * Type definitions for Toonify integration
 * Based on toonify-mcp v0.3.0 multilingual features
 */

/**
 * Language profile from toonify-mcp
 */
export interface LanguageProfile {
  code: string;                    // ISO 639-1 code (e.g., 'en', 'zh', 'ja')
  name: string;                    // English name
  nativeName: string;              // Native name (e.g., 'Chinese', 'Japanese')
  tokenMultiplier: number;         // Token multiplier relative to English (1.0)
  detectionPatterns: RegExp[];     // Patterns for language detection
  confidence: number;              // Confidence in multiplier accuracy (0-1)
}

/**
 * Supported languages with token multipliers
 * Source: toonify-mcp v0.3.0 LANGUAGE_PROFILES
 */
export const SUPPORTED_LANGUAGES = {
  ENGLISH: { code: 'en', multiplier: 1.0 },
  SPANISH: { code: 'es', multiplier: 1.7 },
  FRENCH: { code: 'fr', multiplier: 1.8 },
  GERMAN: { code: 'de', multiplier: 1.6 },
  CHINESE: { code: 'zh', multiplier: 2.0 },
  JAPANESE: { code: 'ja', multiplier: 2.5 },
  KOREAN: { code: 'ko', multiplier: 2.3 },
  ARABIC: { code: 'ar', multiplier: 3.0 },
  TAMIL: { code: 'ta', multiplier: 4.5 },
  HINDI: { code: 'hi', multiplier: 3.5 },
  RUSSIAN: { code: 'ru', multiplier: 1.9 },
  PORTUGUESE: { code: 'pt', multiplier: 1.7 },
  THAI: { code: 'th', multiplier: 4.0 },
  VIETNAMESE: { code: 'vi', multiplier: 1.5 },
  INDONESIAN: { code: 'id', multiplier: 1.4 },
} as const;

/**
 * MCP tool response from toonify-mcp
 */
export interface ToonifyMCPResponse {
  content: {
    type: 'text';
    text: string;
  }[];
}

/**
 * Optimization request for MCP
 */
export interface OptimizeContentRequest {
  content: string;
  toolName?: string;
  force_optimization?: boolean;
}

/**
 * Statistics request for MCP
 */
export interface GetStatsRequest {
  // No parameters needed
}

/**
 * Statistics response from toonify-mcp
 */
export interface ToonifyStats {
  totalOptimizations: number;
  totalTokensSaved: number;
  averageSavingsPercent: number;
  cacheHitRate: number;
  lastReset: string;
}
