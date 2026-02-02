# AI Mistake Learning System

**Automatic detection and learning from user corrections.**

## 🎯 Overview

The mistake learning system enables MeMesh/memesh to automatically:
1. **Detect** when users correct AI behavior (multi-language support)
2. **Record** mistakes with context and classification
3. **Learn** patterns from recurring errors
4. **Prevent** repeating the same mistakes

## 🆓 Free Tier vs 💎 Paid Tier

### Free Tier (Local Detection)
- ✅ Multi-language keyword pattern matching (10 languages)
- ✅ Basic confidence scoring
- ✅ Context-aware detection
- ✅ Local storage (SQLite)
- ✅ Pattern recognition (statistical)

### Paid Tier (Cloud Advanced)
- ✅ Everything in Free Tier
- 🔒 LLM-powered language-agnostic detection
- 🔒 Higher accuracy (90%+ vs 70%)
- 🔒 Semantic pattern clustering (ML)
- 🔒 Cross-user learning (privacy-preserving)
- 🔒 Auto-generated prevention rules

## 📖 Usage

### Basic Setup (Free Tier)

```typescript
import { FeedbackCollector, LearningManager } from '@pcircle/memesh/evolution';

// Initialize
const learningManager = new LearningManager();
const feedbackCollector = new FeedbackCollector(learningManager, {
  enableAutoDetection: true,  // Enable automatic detection
});

// Process every user message
await feedbackCollector.processUserMessage(
  "No, that's wrong. Should be POST instead.",
  "AI suggested using GET request",  // What AI did
  { taskType: 'api-design', project: 'my-app' }  // Context
);

// Check recorded mistakes
const mistakes = feedbackCollector.getMistakes();
console.log(`Recorded ${mistakes.length} mistakes`);
```

### Advanced Setup (Paid Tier)

```typescript
import { FeedbackCollector, LearningManager } from '@pcircle/memesh/evolution';

const feedbackCollector = new FeedbackCollector(learningManager, {
  enableAutoDetection: true,
  cloudApiKey: process.env.MEMESH_API_KEY,  // 🔒 Enable cloud features
});

// Same API, but uses cloud LLM for higher accuracy
await feedbackCollector.processUserMessage(
  "No, that's wrong. Should be POST instead.",
  "AI suggested using GET request",
  { taskType: 'api-design' }
);

// Check if cloud is enabled
if (feedbackCollector.isCloudEnabled()) {
  console.log('Running with cloud advanced detection');
}
```

### Manual Recording (Legacy)

```typescript
import { AIErrorType } from '@pcircle/memesh/evolution';

// Manual recording (still supported)
feedbackCollector.recordAIMistake({
  action: 'Manual npm publish before GitHub Release',
  errorType: AIErrorType.PROCEDURE_VIOLATION,
  userCorrection: 'Should use GitHub Release to trigger auto-publish',
  correctMethod: 'Create GitHub Release → Actions auto-publish to npm',
  impact: 'Broke automated workflow',
  preventionMethod: 'Run pre-deployment-check.sh before release',
  relatedRule: 'responsible-deployment-workflow',
});
```

### Recording AI Messages

```typescript
// Record what AI says/does (for context)
feedbackCollector.recordAssistantMessage(
  "I will use GET request for this operation"
);

// Then process user correction
await feedbackCollector.processUserMessage(
  "No, should be POST",
  "Suggested using GET request"
);
```

## 🌍 Supported Languages

| Language   | Code | Example Correction                  |
|------------|------|-------------------------------------|
| English    | en   | "No, that's wrong. Should be..."    |
| 中文       | zh   | "不對，應該是..."                    |
| 日本語     | ja   | "違う、...べき"                      |
| Español    | es   | "No, debería ser..."                |
| Français   | fr   | "Non, devrait être..."              |
| Deutsch    | de   | "Nein, sollte sein..."              |
| 한국어     | ko   | "아니, ...해야"                      |
| Português  | pt   | "Não, deveria ser..."               |
| Русский    | ru   | "Нет, должно быть..."               |
| العربية    | ar   | "لا، يجب أن..."                     |

## 📊 Detection Results

```typescript
interface CorrectionDetection {
  isCorrection: boolean;      // Whether correction detected
  confidence: number;          // 0-1 confidence score
  language?: string;           // Detected language
  wrongAction?: string;        // What AI did wrong
  correctMethod?: string;      // What should be done
}

// Example result
{
  isCorrection: true,
  confidence: 0.9,
  language: 'en',
  wrongAction: 'using GET',
  correctMethod: 'using POST instead'
}
```

## 🔍 Error Types

```typescript
enum AIErrorType {
  PROCEDURE_VIOLATION = 'procedure-violation',    // Violated workflow
  WORKFLOW_SKIP = 'workflow-skip',                // Skipped required step
  ASSUMPTION_ERROR = 'assumption-error',          // Made wrong assumption
  VALIDATION_SKIP = 'validation-skip',            // Skipped validation
  RESPONSIBILITY_LACK = 'responsibility-lack',    // Lacked ownership
  FIREFIGHTING = 'firefighting',                  // Reactive instead of proactive
  DEPENDENCY_MISS = 'dependency-miss',            // Missing dependency
  INTEGRATION_ERROR = 'integration-error',        // Integration failure
  DEPLOYMENT_ERROR = 'deployment-error',          // Deployment issue
}
```

## 🧪 Testing

```typescript
import { LocalMistakeDetector } from '@pcircle/memesh/evolution';

const detector = new LocalMistakeDetector();

// Test English detection
const result = detector.detectCorrection("No, that's wrong");
console.log(result);  // { isCorrection: true, confidence: 0.6, language: 'en' }

// Test Chinese detection
const zhResult = detector.detectCorrection("不對，應該是POST");
console.log(zhResult);  // { isCorrection: true, confidence: 0.9, language: 'zh' }

// Test with context
const contextResult = detector.detectCorrectionWithContext(
  "Actually, should be POST",
  [
    { role: 'assistant', content: 'Using GET' },
    { role: 'user', content: 'Actually, should be POST' }
  ]
);
// Confidence boosted because it follows AI message
```

## 🎓 Learning Patterns

```typescript
// Get all mistakes
const mistakes = feedbackCollector.getMistakes();

// Get by error type
const procedureViolations = feedbackCollector.getMistakesByType(
  AIErrorType.PROCEDURE_VIOLATION
);

// Get recent mistakes
const recent = feedbackCollector.getRecentMistakes(10);

// Get conversation history (debugging)
const history = feedbackCollector.getConversationHistory();
```

## 🔒 Cloud API (Paid Feature)

The cloud API is **not implemented in the open source version**. It's a placeholder interface.

For the paid version (memesh-server), the cloud API provides:
- LLM-powered detection (language-agnostic)
- ML pattern clustering
- Cross-user learning (privacy-preserving)
- Auto-generated prevention rules

## 📝 Best Practices

1. **Call `processUserMessage()` for every user message** - even if you're not sure it's a correction
2. **Call `recordAssistantMessage()` for AI responses** - provides context for better detection
3. **Check confidence scores** - only act on corrections with confidence ≥ 0.6
4. **Review detected mistakes** - false positives can happen
5. **Store to persistent storage** - currently in-memory, add persistence layer

## 🚀 Roadmap

- [ ] Persistent storage (SQLite integration)
- [ ] Pattern visualization dashboard
- [ ] Auto-prevention rules generation
- [ ] MCP tool integration (hook-tool-use)
- [ ] Cross-session learning
- [ ] Behavioral analytics

## 📚 Examples

See `LocalMistakeDetector.test.ts` for comprehensive examples.

## 🤝 Contributing

To add a new language:
1. Add patterns to `CORRECTION_PATTERNS` in `LocalMistakeDetector.ts`
2. Add extraction logic in `extractCorrectionContent()`
3. Add tests in `LocalMistakeDetector.test.ts`
