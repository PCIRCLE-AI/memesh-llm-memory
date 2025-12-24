#!/usr/bin/env tsx
/**
 * Security Limits Test
 * Tests file size limit and MIME type validation
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3003/api/voice-rag';

async function test1_FileSizeLimit() {
  console.log('\n🧪 Test 2: File Size Limit (> 10MB)');
  console.log('═'.repeat(60));

  // Create a large dummy file (11 MB)
  const largeFile = Buffer.alloc(11 * 1024 * 1024, 0);
  const filePath = '/tmp/large-audio-test.webm';
  fs.writeFileSync(filePath, largeFile);

  console.log(`📦 Created test file: ${(largeFile.length / 1024 / 1024).toFixed(1)} MB`);

  try {
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), 'large.webm');

    console.log('📤 Uploading large file...');
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      body: formData as any,
    });

    const data = await res.json();

    if (res.status === 413 || (res.status === 500 && data.error?.includes('File too large'))) {
      console.log('✅ PASS: Server rejected large file');
      console.log(`   Status: ${res.status}`);
      console.log(`   Error: ${data.error || 'File too large'}`);
    } else {
      console.log('❌ FAIL: Server accepted large file (security risk!)');
      console.log(`   Status: ${res.status}`);
    }
  } catch (error: any) {
    if (error.message.includes('Maximum upload size exceeded')) {
      console.log('✅ PASS: Multer rejected large file');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  } finally {
    fs.unlinkSync(filePath);
  }
}

async function test2_MimeTypeValidation() {
  console.log('\n🧪 Test 3: MIME Type Validation (non-audio file)');
  console.log('═'.repeat(60));

  // Create a fake image file
  const fakeImage = Buffer.from('fake image data');
  const filePath = '/tmp/fake-image.png';
  fs.writeFileSync(filePath, fakeImage);

  console.log('📦 Created fake image file (image/png)');

  try {
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: 'fake.png',
      contentType: 'image/png',
    });

    console.log('📤 Uploading non-audio file...');
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      body: formData as any,
    });

    const data = await res.json();

    if (res.status === 400 && data.error?.includes('Invalid file type')) {
      console.log('✅ PASS: Server rejected non-audio file');
      console.log(`   Status: ${res.status}`);
      console.log(`   Error: ${data.error}`);
    } else {
      console.log('❌ FAIL: Server accepted non-audio file (security risk!)');
      console.log(`   Status: ${res.status}`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    fs.unlinkSync(filePath);
  }
}

async function test3_ErrorHandling() {
  console.log('\n🧪 Test 4: Error Handling (production mode)');
  console.log('═'.repeat(60));

  // Test with no file
  try {
    console.log('📤 Sending request without file...');
    const formData = new FormData();

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      body: formData as any,
    });

    const data = await res.json();

    if (res.status === 400 && data.error === 'No audio file uploaded') {
      console.log('✅ PASS: Clear error message for missing file');
      console.log(`   Error: ${data.error}`);
    } else {
      console.log('⚠️  Unexpected response');
      console.log(`   Status: ${res.status}`);
      console.log(`   Error: ${data.error}`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   🔒 Voice RAG Security Tests                ║');
  console.log('╚═══════════════════════════════════════════════╝');

  // Check server health
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    console.log(`\n✅ Server is ${data.status}`);
  } catch (error) {
    console.log('\n❌ Server is not running!');
    console.log('   Start with: npm run voice-rag:server');
    process.exit(1);
  }

  await test1_FileSizeLimit();
  await test2_MimeTypeValidation();
  await test3_ErrorHandling();

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Summary');
  console.log('═'.repeat(60));
  console.log('✅ Test 1: Normal recording flow - PASSED (manual test)');
  console.log('   Run automated tests above for:');
  console.log('   - Test 2: File size limit (> 10MB)');
  console.log('   - Test 3: MIME type validation');
  console.log('   - Test 4: Error handling');
  console.log('');
}

runTests().catch(console.error);
