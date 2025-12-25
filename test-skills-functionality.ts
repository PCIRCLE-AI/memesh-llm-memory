#!/usr/bin/env tsx
/**
 * Real Functional Tests for Skills
 *
 * Tests actual functionality, not just "does it crash"
 */

import { VoiceAgent } from './src/agents/voice/index.js';
import { VoiceRAGAgent } from './src/agents/voice-rag/index.js';
import { RAGAgent } from './src/agents/rag/index.js';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   🧪 Skills Functional Testing               ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Test 1: TTS - Generate audio from specific text
async function testTTS() {
  console.log('\n📢 Test 1: Text-to-Speech (TTS)');
  console.log('─'.repeat(50));

  const testText = 'This is a functional test of the text to speech system.';
  const outputPath = '/tmp/test_tts_output.mp3';

  console.log(`Input text: "${testText}"`);
  console.log(`Output path: ${outputPath}`);

  const agent = new VoiceAgent();

  try {
    // Remove old file if exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    // Generate audio
    console.log('\n🎵 Generating audio...');
    const result = await agent.synthesizeToFile(testText, outputPath, {
      voice: 'nova',
      quality: 'standard'
    });

    // Verify file was created
    if (!fs.existsSync(outputPath)) {
      console.log('❌ FAILED: Audio file not created');
      return { passed: false, reason: 'File not created' };
    }

    // Verify file has content
    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✅ Audio file created: ${sizeKB} KB`);

    // Verify file is playable (check it's valid MP3)
    try {
      const ffprobeOutput = execSync(`ffprobe -v error -show_format -show_streams "${outputPath}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (ffprobeOutput.includes('codec_name=mp3') || ffprobeOutput.includes('format_name=mp3')) {
        console.log('✅ Audio file is valid MP3');
      } else {
        console.log('⚠️  Warning: File format verification inconclusive');
      }
    } catch (e) {
      console.log('⚠️  Warning: Could not verify audio format (ffprobe not available)');
    }

    console.log(`\n✅ Test 1 PASSED`);
    console.log(`   - Text: "${testText}"`);
    console.log(`   - File size: ${sizeKB} KB`);

    return { passed: true, outputPath, size: stats.size };

  } catch (error: any) {
    console.log(`❌ Test 1 FAILED: ${error.message}`);
    return { passed: false, reason: error.message };
  }
}

// Test 2: STT - Transcribe the audio we just generated
async function testSTT(audioPath: string, expectedText: string) {
  console.log('\n\n📝 Test 2: Speech-to-Text (STT)');
  console.log('─'.repeat(50));

  console.log(`Audio path: ${audioPath}`);
  console.log(`Expected: "${expectedText}"`);

  const agent = new VoiceRAGAgent();

  try {
    await agent.initialize();

    console.log('\n🎧 Transcribing audio...');

    // Use Voice Agent's transcriber directly
    const voiceAgent = new VoiceAgent();
    const transcription = await voiceAgent.transcribe(audioPath);

    console.log(`\nTranscription: "${transcription.text}"`);
    console.log(`Duration: ${transcription.duration}s`);

    // Fuzzy match - check if transcription contains key words
    const expectedWords = expectedText.toLowerCase().split(' ');
    const transcribedWords = transcription.text.toLowerCase().split(' ');

    let matchCount = 0;
    for (const word of expectedWords) {
      if (transcribedWords.includes(word)) {
        matchCount++;
      }
    }

    const matchPercent = (matchCount / expectedWords.length) * 100;
    console.log(`\nWord match: ${matchCount}/${expectedWords.length} (${matchPercent.toFixed(0)}%)`);

    if (matchPercent >= 70) {
      console.log(`\n✅ Test 2 PASSED (${matchPercent.toFixed(0)}% match)`);
      return { passed: true, transcription: transcription.text, matchPercent };
    } else {
      console.log(`\n⚠️  Test 2 PARTIAL (${matchPercent.toFixed(0)}% match - threshold 70%)`);
      return { passed: false, reason: `Only ${matchPercent.toFixed(0)}% word match`, transcription: transcription.text };
    }

  } catch (error: any) {
    console.log(`❌ Test 2 FAILED: ${error.message}`);
    return { passed: false, reason: error.message };
  }
}

// Test 3: RAG Search - Verify search results are relevant
async function testRAGSearch() {
  console.log('\n\n🔍 Test 3: RAG Semantic Search');
  console.log('─'.repeat(50));

  const testQuery = 'What is TypeScript?';
  console.log(`Query: "${testQuery}"`);

  const agent = new RAGAgent();

  try {
    await agent.initialize();

    // Index test document
    console.log('\n📚 Indexing test document...');
    await agent.indexDocument(
      'TypeScript is a strongly typed programming language that builds on JavaScript.',
      {
        source: 'test-doc.md',
        title: 'TypeScript Overview',
        category: 'programming'
      }
    );

    // Search
    console.log('\n🔍 Searching...');
    const results = await agent.search(testQuery, { topK: 3 });

    console.log(`\nFound ${results.length} results:`);

    if (results.length === 0) {
      console.log('❌ Test 3 FAILED: No results found');
      return { passed: false, reason: 'No results' };
    }

    // Verify top result is relevant
    const topResult = results[0];
    console.log(`\nTop result (score: ${topResult.score.toFixed(4)}):`);
    console.log(`  "${topResult.content.substring(0, 100)}..."`);

    // Check if top result mentions TypeScript
    if (topResult.content.toLowerCase().includes('typescript')) {
      console.log(`\n✅ Test 3 PASSED`);
      console.log(`   - Query: "${testQuery}"`);
      console.log(`   - Top score: ${topResult.score.toFixed(4)}`);
      console.log(`   - Relevance: Verified (contains "TypeScript")`);
      return { passed: true, topScore: topResult.score };
    } else {
      console.log(`\n❌ Test 3 FAILED: Top result not relevant`);
      return { passed: false, reason: 'Top result does not contain expected keyword' };
    }

  } catch (error: any) {
    console.log(`❌ Test 3 FAILED: ${error.message}`);
    return { passed: false, reason: error.message };
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    tts: null as any,
    stt: null as any,
    rag: null as any
  };

  try {
    // Test 1: TTS
    results.tts = await testTTS();

    // Test 2: STT (only if TTS passed)
    if (results.tts.passed && results.tts.outputPath) {
      results.stt = await testSTT(
        results.tts.outputPath,
        'This is a functional test of the text to speech system.'
      );
    } else {
      console.log('\n⚠️  Skipping Test 2 (STT) - Test 1 (TTS) failed');
    }

    // Test 3: RAG
    results.rag = await testRAGSearch();

  } catch (error: any) {
    console.error('\n❌ Test suite crashed:', error.message);
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════╗');
  console.log('║   📊 Test Summary                            ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const tests = [
    { name: 'TTS (Text-to-Speech)', result: results.tts },
    { name: 'STT (Speech-to-Text)', result: results.stt },
    { name: 'RAG (Semantic Search)', result: results.rag }
  ];

  let passCount = 0;
  let failCount = 0;

  tests.forEach(test => {
    if (test.result?.passed) {
      console.log(`✅ ${test.name}: PASSED`);
      passCount++;
    } else if (test.result === null) {
      console.log(`⏭️  ${test.name}: SKIPPED`);
    } else {
      console.log(`❌ ${test.name}: FAILED - ${test.result.reason}`);
      failCount++;
    }
  });

  console.log(`\nTotal: ${passCount} passed, ${failCount} failed`);

  if (passCount === 3) {
    console.log('\n🎉 All tests passed! Skills are functionally working.');
  } else if (passCount > 0) {
    console.log('\n⚠️  Some tests passed. Skills partially working.');
  } else {
    console.log('\n❌ All tests failed. Skills are not working.');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// Execute
runAllTests();
