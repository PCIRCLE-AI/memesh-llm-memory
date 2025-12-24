#!/usr/bin/env tsx
/**
 * Voice RAG CLI Demo
 *
 * Simple command-line demo that records audio from your microphone,
 * processes it through Voice RAG Agent, and plays back the response.
 *
 * Usage:
 *   npm run voice-rag
 *
 * Requirements:
 *   - macOS with working microphone
 *   - sox (brew install sox) for audio recording
 *   - afplay (built-in macOS) for audio playback
 */

import { VoiceRAGAgent } from './index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function recordAudio(outputPath: string, duration: number = 5): Promise<void> {
  console.log(`\n🎤 Recording for ${duration} seconds... SPEAK NOW!\n`);

  try {
    // Use sox to record from default microphone
    await execAsync(`rec ${outputPath} trim 0 ${duration}`);
    console.log('✅ Recording complete\n');
  } catch (error: any) {
    if (error.message.includes('sox: command not found')) {
      console.error('❌ Error: sox not installed');
      console.error('   Install with: brew install sox');
      process.exit(1);
    }
    throw error;
  }
}

async function playAudio(audioPath: string): Promise<void> {
  console.log('\n🔊 Playing response...\n');
  await execAsync(`afplay ${audioPath}`);
  console.log('✅ Playback complete\n');
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   🎙️  Voice RAG Agent - CLI Demo            ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Initialize Voice RAG Agent
  console.log('Initializing Voice RAG Agent...');
  const agent = new VoiceRAGAgent();
  await agent.initialize();
  console.log('✅ Agent initialized\n');

  // Create temp directory for audio files
  const tmpDir = '/tmp/voice-rag-demo';
  await fs.mkdir(tmpDir, { recursive: true });

  const inputAudio = path.join(tmpDir, 'input.wav');
  const outputAudio = path.join(tmpDir, 'output.mp3');

  try {
    // Record audio from microphone
    await recordAudio(inputAudio, 5);

    // Process through Voice RAG
    console.log('🤖 Processing your question...\n');
    const result = await agent.processVoiceQuery(inputAudio, {
      outputPath: outputAudio,
      maxContextDocs: 3,
      ttsOptions: {
        voice: 'nova',
        speed: 1.1,
      },
    });

    // Display results
    console.log('═══════════════════════════════════════════════\n');
    console.log(`👤 You asked: "${result.userQuestion}"\n`);

    if (result.retrievedDocs.length > 0) {
      console.log('📚 Retrieved documents:');
      result.retrievedDocs.forEach((doc, i) => {
        console.log(`   ${i + 1}. [${doc.source}] (score: ${doc.score.toFixed(3)})`);
        console.log(`      ${doc.content.substring(0, 100)}...`);
      });
      console.log('');
    } else {
      console.log('📚 No relevant documents found\n');
    }

    console.log(`🤖 Claude responds: "${result.claudeResponse}"\n`);
    console.log('═══════════════════════════════════════════════\n');

    // Display metrics
    console.log('📊 Performance Metrics:');
    console.log(`   Transcription: $${result.metrics.transcriptionCost.toFixed(4)}`);
    console.log(`   TTS: $${result.metrics.ttsCost.toFixed(4)}`);
    console.log(`   RAG retrieval: ${result.metrics.ragRetrievalTime}ms`);
    console.log(`   Claude response: ${result.metrics.claudeResponseTime}ms`);
    console.log(`   Total: ${(result.metrics.totalTime / 1000).toFixed(2)}s\n`);

    // Play audio response
    await playAudio(outputAudio);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Demo complete!\n');
}

main();
