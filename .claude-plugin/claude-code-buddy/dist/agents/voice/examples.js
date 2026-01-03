import VoiceAgent from './index';
import { join } from 'path';
async function example1_BasicTTS() {
    console.log('\n📢 Example 1: Basic Text-to-Speech');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    const englishText = 'Hello! Welcome to the Smart Agents Voice AI system.';
    const englishAudio = await agent.synthesize(englishText, {
        voice: 'alloy',
        quality: 'standard',
    });
    console.log(`✅ Generated English audio: ${(englishAudio.audio.length / 1024).toFixed(2)}KB`);
    const chineseText = '你好！歡迎使用智能代理語音系統。';
    const chineseAudio = await agent.synthesize(chineseText, {
        voice: 'nova',
        quality: 'hd',
    });
    console.log(`✅ Generated Chinese audio: ${(chineseAudio.audio.length / 1024).toFixed(2)}KB`);
}
async function example2_VoiceComparison() {
    console.log('\n🎭 Example 2: Voice Comparison');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    const sampleText = 'This is a voice comparison test.';
    const voices = VoiceAgent.getAvailableVoices();
    console.log(`Testing ${voices.length} different voices...\n`);
    for (const voice of voices) {
        const result = await agent.synthesize(sampleText, { voice });
        console.log(`  ${voice.padEnd(10)} → ${(result.audio.length / 1024).toFixed(2)}KB`);
    }
    console.log('\n✅ All voices tested successfully');
}
async function example3_StreamingSynthesis() {
    console.log('\n🌊 Example 3: Streaming Synthesis');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    const longText = `
    The future of artificial intelligence is here.
    Voice AI agents can now understand and respond to human speech in real-time.
    This technology opens up new possibilities for human-computer interaction.
    From virtual assistants to automated customer service, the applications are endless.
  `.trim();
    console.log('Starting streaming synthesis...');
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of agent.synthesizeStream(longText, {
        voice: 'echo',
        speed: 1.1,
    })) {
        totalBytes += chunk.length;
        chunks.push(chunk);
        console.log(`  Received chunk: ${chunk.length} bytes (total: ${totalBytes})`);
    }
    const fullAudio = Buffer.concat(chunks);
    console.log(`\n✅ Streaming complete: ${(fullAudio.length / 1024).toFixed(2)}KB total`);
}
async function example4_MultiLanguage() {
    console.log('\n🌐 Example 4: Multi-Language Support');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    const languages = [
        { lang: 'en', text: 'Good morning, how are you today?', voice: 'alloy' },
        { lang: 'zh', text: '早安，你今天好嗎？', voice: 'nova' },
        { lang: 'ja', text: 'おはようございます、今日はいかがですか？', voice: 'shimmer' },
        { lang: 'es', text: 'Buenos días, ¿cómo estás hoy?', voice: 'fable' },
        { lang: 'fr', text: 'Bonjour, comment allez-vous aujourd\'hui?', voice: 'onyx' },
    ];
    for (const { lang, text, voice } of languages) {
        const result = await agent.synthesize(text, { voice });
        console.log(`  ${lang.toUpperCase()}: ${text.substring(0, 30)}... → ${(result.audio.length / 1024).toFixed(2)}KB`);
    }
    console.log('\n✅ Multi-language synthesis completed');
}
async function example5_QualityComparison() {
    console.log('\n⭐ Example 5: Quality Comparison (Standard vs HD)');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    const text = 'This is a quality comparison between standard and HD models.';
    const standardStart = Date.now();
    const standard = await agent.synthesize(text, {
        voice: 'alloy',
        quality: 'standard',
    });
    const standardTime = Date.now() - standardStart;
    const hdStart = Date.now();
    const hd = await agent.synthesize(text, {
        voice: 'alloy',
        quality: 'hd',
    });
    const hdTime = Date.now() - hdStart;
    console.log('\nResults:');
    console.log(`  Standard: ${(standard.audio.length / 1024).toFixed(2)}KB in ${standardTime}ms`);
    console.log(`  HD:       ${(hd.audio.length / 1024).toFixed(2)}KB in ${hdTime}ms`);
    console.log(`  Size difference: ${(((hd.audio.length - standard.audio.length) / standard.audio.length) * 100).toFixed(1)}%`);
    console.log('\n✅ Quality comparison completed');
}
async function example6_SpeedAdjustment() {
    console.log('\n⚡ Example 6: Speed Adjustment');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    const text = 'This is a test of different speech speeds.';
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    console.log('\nGenerating audio at different speeds...\n');
    for (const speed of speeds) {
        const result = await agent.synthesize(text, {
            voice: 'nova',
            speed,
        });
        console.log(`  ${speed.toFixed(2)}x speed → ${(result.audio.length / 1024).toFixed(2)}KB`);
    }
    console.log('\n✅ Speed adjustment test completed');
}
async function example7_CostTracking() {
    console.log('\n💰 Example 7: Cost Tracking');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    await agent.synthesize('Short text.', { voice: 'alloy' });
    await agent.synthesize('This is a medium length text for testing.', { voice: 'echo' });
    await agent.synthesize('This is a longer text that will cost more to synthesize because it has more characters.', { voice: 'nova' });
    const detailed = agent.getDetailedMetrics();
    console.log('\nCost Breakdown:');
    console.log(`  Total characters: ${detailed.synthesizer.totalCharacters}`);
    console.log(`  Cost per 1K chars: $${detailed.synthesizer.costPer1KChars}`);
    console.log(`  Total cost: $${detailed.synthesizer.totalCost.toFixed(6)}`);
    console.log(`  Uptime: ${(detailed.uptime / 1000).toFixed(2)}s`);
    console.log('\n✅ Cost tracking demonstrated');
}
async function example8_ErrorHandling() {
    console.log('\n🛡️ Example 8: Error Handling');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    try {
        await agent.synthesize('');
        console.log('❌ Should have thrown error');
    }
    catch (error) {
        console.log(`✅ Caught error: ${error.message} (code: ${error.code})`);
    }
    const veryLongText = 'Test. '.repeat(10000);
    console.log(`\nAttempting to synthesize ${veryLongText.length} characters...`);
    const result = await agent.synthesize(veryLongText);
    const metrics = agent.getMetrics();
    console.log(`✅ Synthesis successful`);
    console.log(`   Audio size: ${(result.audio.length / 1024).toFixed(2)}KB`);
    console.log(`   Cost: $${metrics.totalCost.toFixed(4)}`);
    console.log(`   ⚠️  Large text detected - cost may be significant!`);
}
async function example9_SaveToFiles() {
    console.log('\n💾 Example 9: Save to Files');
    console.log('='.repeat(60));
    const agent = new VoiceAgent();
    const outputDir = '/tmp/voice_examples';
    const examples = [
        { name: 'greeting_en', text: 'Hello! Welcome to our service.', voice: 'alloy' },
        { name: 'greeting_zh', text: '你好！歡迎使用我們的服務。', voice: 'nova' },
        { name: 'notification', text: 'You have a new message.', voice: 'shimmer' },
    ];
    console.log(`Saving audio files to ${outputDir}...\n`);
    for (const example of examples) {
        const outputPath = join(outputDir, `${example.name}.mp3`);
        await agent.synthesizeToFile(example.text, outputPath, {
            voice: example.voice,
        });
        console.log(`  ✅ Saved: ${example.name}.mp3`);
    }
    console.log('\n✅ All files saved successfully');
}
async function runAllExamples() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         Voice AI Agent - Usage Examples               ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    try {
        await example1_BasicTTS();
        await example2_VoiceComparison();
        await example3_StreamingSynthesis();
        await example4_MultiLanguage();
        await example5_QualityComparison();
        await example6_SpeedAdjustment();
        await example7_CostTracking();
        await example8_ErrorHandling();
        await example9_SaveToFiles();
        console.log('\n' + '='.repeat(60));
        console.log('🎉 All examples completed successfully!');
        console.log('='.repeat(60));
    }
    catch (error) {
        console.error('\n❌ Example failed:', error);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples();
}
export { example1_BasicTTS, example2_VoiceComparison, example3_StreamingSynthesis, example4_MultiLanguage, example5_QualityComparison, example6_SpeedAdjustment, example7_CostTracking, example8_ErrorHandling, example9_SaveToFiles, runAllExamples, };
//# sourceMappingURL=examples.js.map