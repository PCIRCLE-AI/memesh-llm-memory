#!/usr/bin/env tsx
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import * as readline from 'readline';

const execAsync = promisify(exec);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

async function recordAudio(outputPath: string, duration: number = 10): Promise<void> {
  console.log('\n🔴 錄音中... 請說話 (按 Ctrl+C 可隨時停止)');
  await execAsync(`ffmpeg -f avfoundation -i ":0" -t ${duration} -y "${outputPath}" 2>&1 > /dev/null`);
  console.log('✅ 錄音完成\n');
}

async function transcribe(audioPath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
  });
  return transcription.text;
}

async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({ role: 'user', content: userMessage });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: conversationHistory
  });

  const response = message.content[0];
  const responseText = response.type === 'text' ? response.text : '';

  conversationHistory.push({ role: 'assistant', content: responseText });

  return responseText;
}

async function speak(text: string, outputPath: string): Promise<void> {
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'nova',
    input: text,
    speed: 1.1
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(outputPath, buffer);
  await execAsync(`afplay "${outputPath}"`);
}

async function askToContinue(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\n🎙️  按 ENTER 繼續對話，或輸入 "quit" 退出: ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() !== 'quit');
    });
  });
}

async function main() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   🎙️  Interactive Voice Chat with Claude    ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log('💡 每次錄音 10 秒，請準備好後按 ENTER 開始\n');

  const recordingPath = '/tmp/recording.wav';
  const responsePath = '/tmp/response.mp3';

  // 初始問候
  console.log('🤖 Claude: 你好！我是 Smart Agents 語音助手，有什麼可以幫你的嗎？');
  await speak('你好！我是 Smart Agents 語音助手，有什麼可以幫你的嗎？', responsePath);

  // 對話循環
  while (true) {
    const shouldContinue = await askToContinue();
    if (!shouldContinue) {
      console.log('\n👋 再見！\n');
      break;
    }

    try {
      // 錄音
      await recordAudio(recordingPath, 10);

      // 轉文字
      const userText = await transcribe(recordingPath);
      console.log('👤 你: ' + userText + '\n');

      // Claude 回應
      const response = await chat(userText);
      console.log('🤖 Claude: ' + response);

      // 語音播放
      await speak(response, responsePath);

    } catch (error: any) {
      console.error('❌ 錯誤:', error.message);
      console.log('讓我們重試...\n');
    }
  }
}

main();
