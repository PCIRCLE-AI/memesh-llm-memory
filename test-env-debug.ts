import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

console.log('===== Environment Debug =====');
console.log('Current directory:', process.cwd());
console.log('.env file exists:', existsSync('.env'));
console.log('.env file path:', resolve('.env'));

// Load .env
const result = config();
console.log('\ndotenv result:', result);

console.log('\nOPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('OPENAI_API_KEY first 25 chars:', process.env.OPENAI_API_KEY?.substring(0, 25));
console.log('OPENAI_API_KEY last 10 chars:', process.env.OPENAI_API_KEY?.substring(process.env.OPENAI_API_KEY.length - 10));

// Read .env file directly
console.log('\n===== Direct .env File Read =====');
const envContent = readFileSync('.env', 'utf8');
const openaiLine = envContent.split('\n').find(line => line.startsWith('OPENAI_API_KEY='));
if (openaiLine) {
  const key = openaiLine.split('=')[1];
  console.log('First 25 chars from file:', key.substring(0, 25));
  console.log('Last 10 chars from file:', key.substring(key.length - 10));
  console.log('Length from file:', key.length);
}
