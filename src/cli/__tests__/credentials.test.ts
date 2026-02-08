import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getCredentialsPath,
  loadCredentials,
  saveCredentials,
  deleteCredentials,
  type MeMeshCredentials,
} from '../credentials.js';

// Use a temp directory for test isolation
let tempDir: string;
let originalEnv: string | undefined;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memesh-creds-test-'));
  originalEnv = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tempDir;
});

afterEach(() => {
  if (originalEnv !== undefined) {
    process.env.XDG_CONFIG_HOME = originalEnv;
  } else {
    delete process.env.XDG_CONFIG_HOME;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('getCredentialsPath', () => {
  it('should use XDG_CONFIG_HOME when set', () => {
    process.env.XDG_CONFIG_HOME = '/custom/config';
    expect(getCredentialsPath()).toBe('/custom/config/memesh/credentials.json');
  });

  it('should fall back to ~/.config when XDG_CONFIG_HOME is unset', () => {
    delete process.env.XDG_CONFIG_HOME;
    const expected = path.join(os.homedir(), '.config', 'memesh', 'credentials.json');
    expect(getCredentialsPath()).toBe(expected);
  });
});

describe('saveCredentials', () => {
  it('should create directory and write credentials file', () => {
    const creds: MeMeshCredentials = {
      apiKey: 'sk_memmesh_test123',
      email: 'test@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    saveCredentials(creds);

    const credPath = getCredentialsPath();
    expect(fs.existsSync(credPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    expect(content.apiKey).toBe('sk_memmesh_test123');
    expect(content.email).toBe('test@example.com');
  });

  it('should set file permissions to 0o600', () => {
    saveCredentials({
      apiKey: 'sk_memmesh_test',
      createdAt: new Date().toISOString(),
    });

    const credPath = getCredentialsPath();
    const stats = fs.statSync(credPath);
    expect(stats.mode & 0o777).toBe(0o600);
  });

  it('should overwrite existing credentials', () => {
    saveCredentials({ apiKey: 'old_key', createdAt: '2026-01-01T00:00:00Z' });
    saveCredentials({ apiKey: 'new_key', createdAt: '2026-02-01T00:00:00Z' });

    const creds = loadCredentials();
    expect(creds?.apiKey).toBe('new_key');
  });

  it('should store optional baseUrl', () => {
    saveCredentials({
      apiKey: 'sk_memmesh_test',
      baseUrl: 'https://custom-backend.example.com',
      createdAt: new Date().toISOString(),
    });

    const creds = loadCredentials();
    expect(creds?.baseUrl).toBe('https://custom-backend.example.com');
  });
});

describe('loadCredentials', () => {
  it('should return null when no file exists', () => {
    expect(loadCredentials()).toBeNull();
  });

  it('should return credentials when file is valid', () => {
    saveCredentials({
      apiKey: 'sk_memmesh_abc',
      userId: 'user-123',
      createdAt: '2026-01-01T00:00:00Z',
    });

    const creds = loadCredentials();
    expect(creds).not.toBeNull();
    expect(creds!.apiKey).toBe('sk_memmesh_abc');
    expect(creds!.userId).toBe('user-123');
  });

  it('should return null for invalid JSON', () => {
    const credPath = getCredentialsPath();
    fs.mkdirSync(path.dirname(credPath), { recursive: true });
    fs.writeFileSync(credPath, 'not json at all');

    expect(loadCredentials()).toBeNull();
  });

  it('should return null when apiKey is missing', () => {
    const credPath = getCredentialsPath();
    fs.mkdirSync(path.dirname(credPath), { recursive: true });
    fs.writeFileSync(credPath, JSON.stringify({ email: 'test@example.com' }));

    expect(loadCredentials()).toBeNull();
  });

  it('should return null when apiKey is not a string', () => {
    const credPath = getCredentialsPath();
    fs.mkdirSync(path.dirname(credPath), { recursive: true });
    fs.writeFileSync(credPath, JSON.stringify({ apiKey: 12345 }));

    expect(loadCredentials()).toBeNull();
  });

  it('should return null when apiKey is empty string', () => {
    const credPath = getCredentialsPath();
    fs.mkdirSync(path.dirname(credPath), { recursive: true });
    fs.writeFileSync(credPath, JSON.stringify({ apiKey: '' }));

    expect(loadCredentials()).toBeNull();
  });
});

describe('deleteCredentials', () => {
  it('should delete existing credentials and return true', () => {
    saveCredentials({
      apiKey: 'sk_memmesh_todelete',
      createdAt: new Date().toISOString(),
    });

    const result = deleteCredentials();
    expect(result).toBe(true);
    expect(loadCredentials()).toBeNull();
  });

  it('should return false when no file exists', () => {
    const result = deleteCredentials();
    expect(result).toBe(false);
  });
});
