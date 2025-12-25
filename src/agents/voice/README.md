# Voice AI Agent

完整的語音 AI 代理，支援語音轉文字（Whisper）和文字轉語音（TTS）功能。

## 功能特色

### 🎤 語音轉文字 (Speech-to-Text)
- 使用 OpenAI Whisper 模型
- 支援多種語言（中文、英文、日文、韓文等）
- 支援多種音訊格式（MP3, WAV, M4A, FLAC, OGG, WebM）
- 自動檢測檔案大小（25MB 限制）
- 提供詳細的時間軸分段資訊
- 成本追蹤（$0.006/分鐘）

### 🔊 文字轉語音 (Text-to-Speech)
- 使用 OpenAI TTS 模型
- 支援 6 種語音角色（alloy, echo, fable, onyx, nova, shimmer）
- 支援標準和 HD 品質
- 支援語速調整（0.25x - 4.0x）
- 串流模式支援即時處理
- 成本追蹤（$0.015/1K 字元）

### 📊 完整的指標追蹤
- 轉錄音訊總時長
- TTS 合成字元數
- 累計成本計算
- 詳細的性能指標

## 快速開始

### 安裝依賴

```bash
npm install openai dotenv zod
```

### 環境配置

在 `.env` 檔案中設定：

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
```

### 基本使用

```typescript
import VoiceAgent from './agents/voice';

// 初始化代理
const agent = new VoiceAgent();

// 語音轉文字
const transcription = await agent.transcribe('./audio.mp3', {
  language: 'zh',
  responseFormat: 'verbose_json'
});
console.log(transcription.text);

// 文字轉語音
const audio = await agent.synthesize('你好，世界！', {
  voice: 'nova',
  quality: 'hd'
});

// 儲存語音檔案
await agent.synthesizeToFile(
  'Hello, world!',
  './output.mp3',
  { voice: 'alloy' }
);
```

## API 文件

### VoiceAgent

主要的語音 AI 代理類別。

#### 建構函式

```typescript
constructor(openAIKey?: string, defaultVoice?: TTSVoice)
```

#### 方法

##### transcribe()

轉錄音訊檔案為文字。

```typescript
async transcribe(
  audioPath: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult>
```

**參數：**
- `audioPath`: 音訊檔案路徑
- `options`: 轉錄選項
  - `language`: 語言代碼（'zh', 'en', 'ja' 等）
  - `prompt`: 提示文字（提高準確度）
  - `temperature`: 採樣溫度（0-1）
  - `responseFormat`: 回應格式（'json', 'text', 'srt', 'vtt', 'verbose_json'）

**回傳：**
```typescript
{
  text: string;           // 轉錄文字
  language?: string;      // 檢測到的語言
  duration?: number;      // 音訊時長（秒）
  segments?: Array<{      // 時間軸分段
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}
```

##### transcribeBuffer()

轉錄音訊緩衝區為文字。

```typescript
async transcribeBuffer(
  audioBuffer: Buffer,
  filename: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult>
```

##### synthesize()

將文字合成為語音。

```typescript
async synthesize(
  text: string,
  options?: TTSOptions
): Promise<TTSResult>
```

**參數：**
- `text`: 要合成的文字
- `options`: TTS 選項
  - `voice`: 語音角色（'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'）
  - `quality`: 品質（'standard', 'hd'）
  - `speed`: 語速（0.25 - 4.0）

**回傳：**
```typescript
{
  audio: Buffer;    // 音訊資料
  format: string;   // 格式（'mp3'）
}
```

##### synthesizeToFile()

合成語音並儲存為檔案。

```typescript
async synthesizeToFile(
  text: string,
  outputPath: string,
  options?: TTSOptions
): Promise<void>
```

##### synthesizeStream()

串流模式合成語音（即時處理）。

```typescript
synthesizeStream(
  text: string,
  options?: TTSOptions
): AsyncGenerator<Buffer>
```

**使用範例：**
```typescript
for await (const chunk of agent.synthesizeStream('Hello!')) {
  // 處理音訊片段
  console.log(`Received ${chunk.length} bytes`);
}
```

##### processVoiceInput()

完整的語音處理管道：音訊輸入 → 轉錄 → 處理 → 合成輸出。

```typescript
async processVoiceInput(
  audioPath: string,
  processor: (text: string) => Promise<string>,
  options?: {
    transcriptionOptions?: TranscriptionOptions;
    ttsOptions?: TTSOptions;
    outputPath?: string;
  }
): Promise<{
  inputText: string;
  outputText: string;
  audioResult?: TTSResult;
}>
```

**使用範例：**
```typescript
const result = await agent.processVoiceInput(
  './input.mp3',
  async (text) => {
    // 使用 Claude 處理文字
    return `您說：${text}。我理解了！`;
  },
  {
    transcriptionOptions: { language: 'zh' },
    ttsOptions: { voice: 'nova' },
    outputPath: './response.mp3'
  }
);
```

##### getMetrics()

獲取使用指標。

```typescript
getMetrics(): VoiceMetrics
```

**回傳：**
```typescript
{
  transcriptionCount: number;
  ttsCount: number;
  totalAudioDuration: number;  // 秒
  totalCharacters: number;
  totalCost: number;            // USD
  lastUpdated: Date;
}
```

##### getDetailedMetrics()

獲取詳細指標分解。

```typescript
getDetailedMetrics(): {
  transcriber: {
    totalDuration: number;
    totalCost: number;
    costPerMinute: number;
  };
  synthesizer: {
    totalCharacters: number;
    totalCost: number;
    costPer1KChars: number;
  };
  uptime: number;
}
```

##### resetMetrics()

重置所有指標。

```typescript
resetMetrics(): void
```

##### static getAvailableVoices()

獲取可用的語音角色列表。

```typescript
static getAvailableVoices(): TTSVoice[]
```

##### testVoices()

測試所有語音角色。

```typescript
async testVoices(sampleText?: string): Promise<void>
```

## 進階使用

### 多語言支援

```typescript
// 中文轉錄
const zhResult = await agent.transcribe('./zh_audio.mp3', {
  language: 'zh',
  prompt: '這是一段關於人工智慧的討論'
});

// 英文轉錄
const enResult = await agent.transcribe('./en_audio.mp3', {
  language: 'en',
  prompt: 'This is a discussion about artificial intelligence'
});
```

### 語音角色對比

```typescript
const voices: TTSVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

for (const voice of voices) {
  await agent.synthesizeToFile(
    'Hello, I am testing different voices.',
    `./output_${voice}.mp3`,
    { voice }
  );
}
```

### 串流處理（即時語音合成）

```typescript
import { createWriteStream } from 'fs';

const writeStream = createWriteStream('./streaming_output.mp3');

for await (const chunk of agent.synthesizeStream('很長的文字內容...')) {
  writeStream.write(chunk);
}

writeStream.end();
```

### 成本監控

```typescript
// 執行多個操作
await agent.transcribe('./audio1.mp3');
await agent.synthesize('Text 1');
await agent.transcribe('./audio2.mp3');
await agent.synthesize('Text 2');

// 檢查累計成本
const metrics = agent.getDetailedMetrics();
console.log(`Total cost: $${(metrics.transcriber.totalCost + metrics.synthesizer.totalCost).toFixed(4)}`);

// 設定預算警告
const BUDGET_LIMIT = 1.0; // $1 USD
if (metrics.transcriber.totalCost + metrics.synthesizer.totalCost > BUDGET_LIMIT) {
  console.warn('⚠️ Budget limit exceeded!');
}
```

### 錯誤處理

```typescript
import { VoiceProcessingError } from './agents/voice/types';

try {
  await agent.transcribe('./large_file.mp3');
} catch (error) {
  if (error instanceof VoiceProcessingError) {
    console.error(`Error code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    console.error(`Details:`, error.details);
  }
}
```

## 成本計算

### Whisper (語音轉文字)
- **價格**: $0.006 / 分鐘
- **範例**: 10 分鐘音訊 = $0.06

### TTS (文字轉語音)
- **標準品質**: $0.015 / 1,000 字元
- **HD 品質**: $0.030 / 1,000 字元
- **範例**: 1,000 字 = $0.015 (標準) 或 $0.030 (HD)

## 最佳實踐

1. **檔案大小限制**：Whisper 有 25MB 限制，較大檔案需要先分割
2. **語言提示**：提供正確的語言代碼可提高準確度
3. **品質選擇**：一般用途使用標準品質，專業場景使用 HD
4. **串流處理**：長文字建議使用串流模式降低延遲
5. **成本控制**：定期檢查指標，設定預算上限

## 執行 Demo

```bash
npm run voice
```

或直接執行：

```bash
tsx src/agents/voice/index.ts
```

## 授權

MIT
