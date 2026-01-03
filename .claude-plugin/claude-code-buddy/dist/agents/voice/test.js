import VoiceAgent from './index';
import { Transcriber } from './transcriber';
import { Synthesizer } from './synthesizer';
import { VoiceProcessingError } from './types';
async function testInitialization() {
    console.log('\n=== Test: Initialization ===');
    try {
        new VoiceAgent();
        console.log('✅ VoiceAgent initialized successfully');
        new Transcriber();
        console.log('✅ Transcriber initialized successfully');
        new Synthesizer();
        console.log('✅ Synthesizer initialized successfully');
        return true;
    }
    catch (error) {
        console.error('❌ Initialization failed:', error);
        return false;
    }
}
async function testAvailableVoices() {
    console.log('\n=== Test: Available Voices ===');
    try {
        const voices = VoiceAgent.getAvailableVoices();
        console.log(`Found ${voices.length} voices:`, voices);
        if (voices.length === 6) {
            console.log('✅ All 6 voices available');
            return true;
        }
        else {
            console.error(`❌ Expected 6 voices, got ${voices.length}`);
            return false;
        }
    }
    catch (error) {
        console.error('❌ Failed to get voices:', error);
        return false;
    }
}
async function testErrorHandling() {
    console.log('\n=== Test: Error Handling ===');
    try {
        const agent = new VoiceAgent();
        try {
            await agent.synthesize('');
            console.error('❌ Should have thrown error for empty text');
            return false;
        }
        catch (error) {
            if (error instanceof VoiceProcessingError && error.code === 'EMPTY_TEXT') {
                console.log('✅ Correctly throws VoiceProcessingError for empty text');
            }
            else {
                console.error('❌ Wrong error type:', error);
                return false;
            }
        }
        return true;
    }
    catch (error) {
        console.error('❌ Error handling test failed:', error);
        return false;
    }
}
async function testMetrics() {
    console.log('\n=== Test: Metrics Tracking ===');
    try {
        const agent = new VoiceAgent();
        await agent.synthesize('Hello, this is a test.');
        const metrics = agent.getMetrics();
        console.log('Metrics:', metrics);
        if (metrics.totalCharacters > 0 && metrics.totalCost > 0) {
            console.log('✅ Metrics tracked correctly');
            console.log(`   Characters: ${metrics.totalCharacters}`);
            console.log(`   Cost: $${metrics.totalCost.toFixed(6)}`);
            return true;
        }
        else {
            console.error('❌ Metrics not tracking properly');
            return false;
        }
    }
    catch (error) {
        console.error('❌ Metrics test failed:', error);
        return false;
    }
}
async function testDetailedMetrics() {
    console.log('\n=== Test: Detailed Metrics ===');
    try {
        const agent = new VoiceAgent();
        await agent.synthesize('Testing detailed metrics.');
        const detailed = agent.getDetailedMetrics();
        console.log('Detailed metrics:', detailed);
        if (detailed.synthesizer && detailed.uptime >= 0) {
            console.log('✅ Detailed metrics available');
            return true;
        }
        else {
            console.error('❌ Detailed metrics incomplete');
            return false;
        }
    }
    catch (error) {
        console.error('❌ Detailed metrics test failed:', error);
        return false;
    }
}
async function runTests() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Voice AI Agent Test Suite           ║');
    console.log('╚════════════════════════════════════════╝');
    const results = {
        initialization: await testInitialization(),
        availableVoices: await testAvailableVoices(),
        errorHandling: await testErrorHandling(),
        metrics: await testMetrics(),
        detailedMetrics: await testDetailedMetrics(),
    };
    console.log('\n' + '='.repeat(60));
    console.log('Test Results Summary:');
    console.log('='.repeat(60));
    let passed = 0;
    let total = 0;
    for (const [name, result] of Object.entries(results)) {
        total++;
        if (result) {
            passed++;
            console.log(`✅ ${name}`);
        }
        else {
            console.log(`❌ ${name}`);
        }
    }
    console.log('='.repeat(60));
    console.log(`Final Score: ${passed}/${total} tests passed`);
    console.log('='.repeat(60));
    if (passed === total) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
    else {
        console.log(`\n⚠️  ${total - passed} test(s) failed`);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
export { runTests };
//# sourceMappingURL=test.js.map