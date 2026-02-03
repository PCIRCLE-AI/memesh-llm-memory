import { TestGenerator } from '../../tools/TestGenerator.js';
export async function generateTestsTool(input, samplingClient) {
    const generator = new TestGenerator(samplingClient);
    let testCode;
    if (input.specification) {
        testCode = await generator.generateTests(input.specification);
    }
    else if (input.code) {
        testCode = await generator.generateTestsFromCode(input.code);
    }
    else {
        throw new Error('Either specification or code must be provided');
    }
    return {
        testCode,
        message: 'Test cases generated successfully. Review and adjust as needed.',
    };
}
//# sourceMappingURL=generate-tests.js.map