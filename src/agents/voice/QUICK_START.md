# Voice AI Agent - Quick Start Guide

## 🚀 Installation

The Voice AI Agent is already set up! Just ensure you have your OpenAI API key configured:

```bash
# .env file
OPENAI_API_KEY=your_openai_api_key
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
```

## ⚡ Quick Examples

### 1. Text-to-Speech (30 seconds)

```typescript
import VoiceAgent from './agents/voice';

const agent = new VoiceAgent();

// Synthesize speech
const result = await agent.synthesize('Hello, world!', {
  voice: 'nova',
  quality: 'hd'
});

// Save to file
await agent.synthesizeToFile(
  'Hello, world!',
  './output.mp3',
  { voice: 'nova' }
);
```

### 2. Speech-to-Text (30 seconds)

```typescript
import VoiceAgent from './agents/voice';

const agent = new VoiceAgent();

// Transcribe audio file
const transcription = await agent.transcribe('./audio.mp3', {
  language: 'zh',
  responseFormat: 'verbose_json'
});

console.log(transcription.text);
console.log(transcription.segments); // Timestamps
```

### 3. Full Voice Pipeline (1 minute)

```typescript
import VoiceAgent from './agents/voice';

const agent = new VoiceAgent();

// Audio in → Text → Process → Audio out
const result = await agent.processVoiceInput(
  './input.mp3',
  async (text) => {
    // Process the transcribed text
    return `You said: ${text}. I understand!`;
  },
  {
    transcriptionOptions: { language: 'zh' },
    ttsOptions: { voice: 'nova', quality: 'hd' },
    outputPath: './response.mp3'
  }
);

console.log('Input:', result.inputText);
console.log('Output:', result.outputText);
```

## 🎤 Available Voices

```typescript
const voices = VoiceAgent.getAvailableVoices();
// ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

// Test all voices
await agent.testVoices('Sample text to test');
```

## 🌊 Streaming (Real-time)

```typescript
import { createWriteStream } from 'fs';

const stream = createWriteStream('./output.mp3');

for await (const chunk of agent.synthesizeStream('Long text...')) {
  stream.write(chunk);
}

stream.end();
```

## 📊 Cost Tracking

```typescript
// Perform operations
await agent.synthesize('Text 1');
await agent.synthesize('Text 2');

// Check costs
const metrics = agent.getMetrics();
console.log(`Total cost: $${metrics.totalCost.toFixed(6)}`);

// Detailed breakdown
const detailed = agent.getDetailedMetrics();
console.log('Transcriber cost:', detailed.transcriber.totalCost);
console.log('Synthesizer cost:', detailed.synthesizer.totalCost);
```

## 🌐 Multi-Language

```typescript
// Chinese
await agent.synthesize('你好，世界！', { voice: 'nova' });

// English
await agent.synthesize('Hello, world!', { voice: 'alloy' });

// Japanese
await agent.synthesize('こんにちは世界！', { voice: 'shimmer' });

// Spanish
await agent.synthesize('¡Hola, mundo!', { voice: 'fable' });
```

## 🛡️ Error Handling

```typescript
import { VoiceProcessingError } from './agents/voice/types';

try {
  await agent.synthesize('');
} catch (error) {
  if (error instanceof VoiceProcessingError) {
    console.error(`Error code: ${error.code}`);
    console.error(`Message: ${error.message}`);
  }
}
```

## 🎯 Common Use Cases

### Voice Assistant

```typescript
const result = await agent.processVoiceInput(
  './question.mp3',
  async (text) => {
    // Your AI logic here
    return generateResponse(text);
  },
  { outputPath: './answer.mp3' }
);
```

### Audio Book Generator

```typescript
const chapters = ['Chapter 1 text...', 'Chapter 2 text...'];

for (let i = 0; i < chapters.length; i++) {
  await agent.synthesizeToFile(
    chapters[i],
    `./audiobook_chapter_${i + 1}.mp3`,
    { voice: 'fable', quality: 'hd' }
  );
}
```

### Voice Notes Transcription

```typescript
const notes = await agent.transcribe('./voice_note.mp3', {
  language: 'en',
  responseFormat: 'verbose_json'
});

// Save with timestamps
notes.segments?.forEach(seg => {
  console.log(`[${seg.start.toFixed(2)}s] ${seg.text}`);
});
```

### Multi-Voice Dialogue

```typescript
const dialogues = [
  { speaker: 'Alice', text: 'Hello, how are you?', voice: 'nova' },
  { speaker: 'Bob', text: 'I am fine, thank you!', voice: 'onyx' },
];

for (const { speaker, text, voice } of dialogues) {
  await agent.synthesizeToFile(
    text,
    `./dialogue_${speaker}.mp3`,
    { voice: voice as any }
  );
}
```

## 🔧 Advanced Features

### Speed Control

```typescript
await agent.synthesize('Fast speech', { speed: 1.5 });
await agent.synthesize('Slow speech', { speed: 0.75 });
```

### Quality Comparison

```typescript
const standard = await agent.synthesize('Test', { quality: 'standard' });
const hd = await agent.synthesize('Test', { quality: 'hd' });

console.log('Standard:', standard.audio.length, 'bytes');
console.log('HD:', hd.audio.length, 'bytes');
```

### Metrics Reset

```typescript
agent.resetMetrics(); // Start fresh tracking
```

## 🚨 Important Notes

1. **File Size Limit**: Whisper has a 25MB limit for audio files
2. **Cost**: Monitor usage with `getMetrics()` - costs add up quickly!
3. **Language**: Provide language hint for better accuracy
4. **Quality**: HD costs 2x more than standard
5. **Streaming**: Use for texts longer than 1000 characters

## 📚 More Resources

- **Full API Docs**: `README.md`
- **Examples**: `examples.ts` (9 complete examples)
- **Tests**: `test.ts` (run with `tsx src/agents/voice/test.ts`)

## 🎉 That's It!

You're ready to build voice-enabled AI applications!

```bash
# Run the demo
npm run voice

# Or try examples
tsx src/agents/voice/examples.ts

# Or run tests
tsx src/agents/voice/test.ts
```
