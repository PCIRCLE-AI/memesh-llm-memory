/**
 * Local Mistake Detector
 *
 * Detects user corrections using multi-language keyword patterns.
 * This is the free tier detection - good enough for most cases.
 *
 * Supported languages: en, zh, ja, es, fr, de, ko, pt, ru, ar
 */

export interface CorrectionDetection {
  /** Whether a correction was detected */
  isCorrection: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected language */
  language?: string;
  /** Extracted wrong action (if parseable) */
  wrongAction?: string;
  /** Extracted correct method (if parseable) */
  correctMethod?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

/**
 * Multi-language correction patterns
 */
const CORRECTION_PATTERNS = {
  en: {
    negative: [
      /\bno\b,?\s*(that'?s?\s*)?(not|wrong|incorrect)/i,
      /you'?re\s+(wrong|incorrect|mistaken)/i,
      /that'?s\s+(wrong|incorrect|not\s+right)/i,
      /don'?t\s+(do\s+that|say\s+that)/i,
      /stop\s+(doing|saying)/i,
      /\bnot\s+like\s+that\b/i,
    ],
    directive: [
      /should\s+(be|have|do)/i,
      /supposed\s+to/i,
      /actually,?\s+it'?s/i,
      /instead,?\s+(you\s+should|do)/i,
      /the\s+correct\s+(way|method|approach)\s+is/i,
    ],
  },
  zh: {
    negative: [
      /不對/,
      /錯了/,
      /不是/,
      /不應該/,
      /別這樣/,
      /你搞錯/,
      /你理解錯/,
      /你又/,  // "你又犯錯了"
    ],
    directive: [
      /應該是/,
      /應該要/,
      /正確的是/,
      /要這樣/,
    ],
  },
  ja: {
    negative: [
      /違う/,
      /間違い/,
      /そうじゃない/,
      /ダメ/,
    ],
    directive: [
      /べき/,
      /はず/,
      /正しくは/,
    ],
  },
  es: {
    negative: [
      /no,?\s+eso\s+no/i,
      /incorrecto/i,
      /equivocado/i,
      /no\s+debes/i,
    ],
    directive: [
      /debería\s+ser/i,
      /deberías/i,
      /lo\s+correcto\s+es/i,
    ],
  },
  fr: {
    negative: [
      /non,?\s+c'?est\s+(faux|incorrect)/i,
      /tu\s+as\s+tort/i,
      /ne\s+fais\s+pas/i,
    ],
    directive: [
      /devrait\s+être/i,
      /tu\s+devrais/i,
      /la\s+bonne\s+(façon|méthode)/i,
    ],
  },
  de: {
    negative: [
      /nein,?\s+das\s+ist\s+(falsch|nicht\s+richtig)/i,
      /du\s+liegst\s+falsch/i,
      /nicht\s+so/i,
    ],
    directive: [
      /sollte\s+sein/i,
      /du\s+solltest/i,
      /die\s+richtige\s+(Art|Methode)/i,
    ],
  },
  ko: {
    negative: [
      /아니/,
      /틀렸/,
      /잘못/,
    ],
    directive: [
      /해야/,
      /올바른/,
    ],
  },
  pt: {
    negative: [
      /não,?\s+isso\s+(não|está\s+errado)/i,
      /incorreto/i,
      /você\s+está\s+errado/i,
    ],
    directive: [
      /deveria\s+ser/i,
      /o\s+correto\s+é/i,
    ],
  },
  ru: {
    negative: [
      /нет,?\s+это\s+(не\s+так|неправильно)/i,
      /ты\s+не\s+прав/i,
    ],
    directive: [
      /должно\s+быть/i,
      /правильно/i,
    ],
  },
  ar: {
    negative: [
      /لا،?\s*(هذا|ذلك)\s*(خطأ|غير\s+صحيح)/,
      /أنت\s+مخطئ/,
    ],
    directive: [
      /يجب\s+أن/,
      /الصحيح\s+هو/,
    ],
  },
};

export class LocalMistakeDetector {
  /**
   * Detect if user message contains a correction
   *
   * @param userMessage - The user's message
   * @param language - Optional language hint (auto-detect if not provided)
   * @returns Detection result with confidence score
   */
  detectCorrection(
    userMessage: string,
    language?: string
  ): CorrectionDetection {
    // Test all languages if not specified
    const languagesToTest = language
      ? [language]
      : Object.keys(CORRECTION_PATTERNS);

    let bestMatch: CorrectionDetection = {
      isCorrection: false,
      confidence: 0,
    };

    for (const lang of languagesToTest) {
      const patterns = CORRECTION_PATTERNS[lang as keyof typeof CORRECTION_PATTERNS];
      if (!patterns) continue;

      const hasNegative = patterns.negative.some(p => p.test(userMessage));
      const hasDirective = patterns.directive.some(p => p.test(userMessage));

      // Calculate confidence based on pattern matches
      let confidence = 0;
      if (hasNegative && hasDirective) {
        confidence = 0.9; // Very likely a correction
      } else if (hasNegative) {
        confidence = 0.6; // Likely a correction
      } else if (hasDirective) {
        confidence = 0.4; // Possibly a correction
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          isCorrection: confidence >= 0.4,
          confidence,
          language: lang,
          ...this.extractCorrectionContent(userMessage, lang),
        };
      }
    }

    return bestMatch;
  }

  /**
   * Detect correction with conversation context
   *
   * Improves accuracy by checking if message follows AI response
   */
  detectCorrectionWithContext(
    userMessage: string,
    conversationContext: Message[]
  ): CorrectionDetection {
    const basicDetection = this.detectCorrection(userMessage);

    // Boost confidence if message immediately follows AI response
    if (this.isImmediateFollowUp(conversationContext)) {
      basicDetection.confidence = Math.min(basicDetection.confidence + 0.2, 1.0);
      basicDetection.isCorrection = basicDetection.confidence >= 0.4;
    }

    // Lower confidence if message is very long (might be new instruction)
    if (userMessage.length > 500) {
      basicDetection.confidence *= 0.7;
      basicDetection.isCorrection = basicDetection.confidence >= 0.4;
    }

    return basicDetection;
  }

  /**
   * Extract correction content (simple pattern matching)
   */
  private extractCorrectionContent(
    message: string,
    language: string
  ): Pick<CorrectionDetection, 'wrongAction' | 'correctMethod'> {
    const result: Pick<CorrectionDetection, 'wrongAction' | 'correctMethod'> = {};

    // English extraction
    if (language === 'en') {
      const shouldBe = message.match(/should\s+(?:be|do|have)\s+(.+?)(?:\.|$)/i);
      const notShould = message.match(/(?:don't|shouldn't)\s+(.+?)(?:\.|$)/i);

      if (shouldBe) result.correctMethod = shouldBe[1].trim();
      if (notShould) result.wrongAction = notShould[1].trim();
    }

    // Chinese extraction
    if (language === 'zh') {
      const shouldBe = message.match(/應該(?:是|要)(.+?)(?:。|$)/);
      const shouldNot = message.match(/不應該(.+?)(?:。|$)/);

      if (shouldBe) result.correctMethod = shouldBe[1].trim();
      if (shouldNot) result.wrongAction = shouldNot[1].trim();
    }

    // Japanese extraction
    if (language === 'ja') {
      const shouldBe = message.match(/(.+?)べき/);
      if (shouldBe) result.correctMethod = shouldBe[1].trim();
    }

    // Spanish extraction
    if (language === 'es') {
      const shouldBe = message.match(/debería\s+ser\s+(.+?)(?:\.|$)/i);
      if (shouldBe) result.correctMethod = shouldBe[1].trim();
    }

    return result;
  }

  /**
   * Check if message immediately follows an AI response
   */
  private isImmediateFollowUp(conversation: Message[]): boolean {
    if (conversation.length < 2) return false;

    const lastTwo = conversation.slice(-2);
    return (
      lastTwo[0].role === 'assistant' &&
      lastTwo[1].role === 'user'
    );
  }

  /**
   * Detect sentiment (negative = possible correction)
   */
  detectNegativeSentiment(message: string): boolean {
    // Common negative indicators across languages
    const negativeIndicators = [
      /\bno\b/i,
      /not\b/i,
      /don't/i,
      /wrong/i,
      /incorrect/i,
      /不/,  // Chinese: no/not
      /錯/,  // Chinese: wrong
      /違/,  // Japanese: wrong
      /нет/,  // Russian: no
      /non\b/i,  // French: no
      /nein\b/i,  // German: no
      /아니/,  // Korean: no
    ];

    return negativeIndicators.some(p => p.test(message));
  }
}
