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
            /你又/,
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
    detectCorrection(userMessage, language) {
        const languagesToTest = language
            ? [language]
            : Object.keys(CORRECTION_PATTERNS);
        let bestMatch = {
            isCorrection: false,
            confidence: 0,
        };
        for (const lang of languagesToTest) {
            const patterns = CORRECTION_PATTERNS[lang];
            if (!patterns)
                continue;
            const hasNegative = patterns.negative.some(p => p.test(userMessage));
            const hasDirective = patterns.directive.some(p => p.test(userMessage));
            let confidence = 0;
            if (hasNegative && hasDirective) {
                confidence = 0.9;
            }
            else if (hasNegative) {
                confidence = 0.6;
            }
            else if (hasDirective) {
                confidence = 0.4;
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
    detectCorrectionWithContext(userMessage, conversationContext) {
        const basicDetection = this.detectCorrection(userMessage);
        if (this.isImmediateFollowUp(conversationContext)) {
            basicDetection.confidence = Math.min(basicDetection.confidence + 0.2, 1.0);
            basicDetection.isCorrection = basicDetection.confidence >= 0.4;
        }
        if (userMessage.length > 500) {
            basicDetection.confidence *= 0.7;
            basicDetection.isCorrection = basicDetection.confidence >= 0.4;
        }
        return basicDetection;
    }
    extractCorrectionContent(message, language) {
        const result = {};
        if (language === 'en') {
            const shouldBe = message.match(/should\s+(?:be|do|have)\s+(.+?)(?:\.|$)/i);
            const notShould = message.match(/(?:don't|shouldn't)\s+(.+?)(?:\.|$)/i);
            if (shouldBe)
                result.correctMethod = shouldBe[1].trim();
            if (notShould)
                result.wrongAction = notShould[1].trim();
        }
        if (language === 'zh') {
            const shouldBe = message.match(/應該(?:是|要)(.+?)(?:。|$)/);
            const shouldNot = message.match(/不應該(.+?)(?:。|$)/);
            if (shouldBe)
                result.correctMethod = shouldBe[1].trim();
            if (shouldNot)
                result.wrongAction = shouldNot[1].trim();
        }
        if (language === 'ja') {
            const shouldBe = message.match(/(.+?)べき/);
            if (shouldBe)
                result.correctMethod = shouldBe[1].trim();
        }
        if (language === 'es') {
            const shouldBe = message.match(/debería\s+ser\s+(.+?)(?:\.|$)/i);
            if (shouldBe)
                result.correctMethod = shouldBe[1].trim();
        }
        return result;
    }
    isImmediateFollowUp(conversation) {
        if (conversation.length < 2)
            return false;
        const lastTwo = conversation.slice(-2);
        return (lastTwo[0].role === 'assistant' &&
            lastTwo[1].role === 'user');
    }
    detectNegativeSentiment(message) {
        const negativeIndicators = [
            /\bno\b/i,
            /not\b/i,
            /don't/i,
            /wrong/i,
            /incorrect/i,
            /不/,
            /錯/,
            /違/,
            /нет/,
            /non\b/i,
            /nein\b/i,
            /아니/,
        ];
        return negativeIndicators.some(p => p.test(message));
    }
}
//# sourceMappingURL=LocalMistakeDetector.js.map