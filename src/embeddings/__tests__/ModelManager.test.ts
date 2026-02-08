import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelManager } from '../ModelManager.js';
import fs from 'fs';
import os from 'os';

describe('ModelManager', () => {
  let manager: ModelManager;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean environment before each test
    delete process.env.MEMESH_MODEL_DIR;
    delete process.env.MEMESH_DATA_DIR;
    manager = new ModelManager();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getModelDir', () => {
    it('should return path containing model name', () => {
      const modelDir = manager.getModelDir();
      expect(modelDir).toContain('all-MiniLM-L6-v2');
    });

    it('should return platform-specific path on macOS', () => {
      // Only run on macOS
      if (os.platform() === 'darwin') {
        const modelDir = manager.getModelDir();
        expect(modelDir).toContain('Library/Application Support/MeMesh');
      }
    });

    it('should respect MEMESH_MODEL_DIR environment variable', () => {
      process.env.MEMESH_MODEL_DIR = '/custom/models';
      const customManager = new ModelManager();
      expect(customManager.getModelDir()).toBe('/custom/models/all-MiniLM-L6-v2');
    });

    it('should respect MEMESH_DATA_DIR environment variable', () => {
      process.env.MEMESH_DATA_DIR = '/custom/data';
      const customManager = new ModelManager();
      expect(customManager.getModelDir()).toBe('/custom/data/models/all-MiniLM-L6-v2');
    });
  });

  describe('isModelDownloaded', () => {
    it('should return false when model files do not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(await manager.isModelDownloaded()).toBe(false);
    });

    it('should return true when all required files exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      expect(await manager.isModelDownloaded()).toBe(true);
    });

    it('should return false if only some files exist', async () => {
      let callCount = 0;
      vi.spyOn(fs, 'existsSync').mockImplementation(() => {
        callCount++;
        // First file exists, second file does not
        return callCount === 1;
      });
      expect(await manager.isModelDownloaded()).toBe(false);
    });
  });

  describe('getRequiredFiles', () => {
    it('should return list of required model files', () => {
      const files = manager.getRequiredFiles();
      expect(files).toContain('model.onnx');
      expect(files).toContain('tokenizer.json');
      expect(files).toContain('config.json');
    });

    it('should return a copy of the array', () => {
      const files1 = manager.getRequiredFiles();
      const files2 = manager.getRequiredFiles();
      expect(files1).not.toBe(files2);
      expect(files1).toEqual(files2);
    });
  });

  describe('getModelFilePath', () => {
    it('should return full path to model file', () => {
      const modelPath = manager.getModelFilePath('model.onnx');
      expect(modelPath).toContain('all-MiniLM-L6-v2');
      expect(modelPath.endsWith('model.onnx')).toBe(true);
    });
  });

  describe('ensureModel', () => {
    it('should return model directory if model already downloaded', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const modelDir = await manager.ensureModel();
      expect(modelDir).toContain('all-MiniLM-L6-v2');
    });

    it('should create model directory if not exists', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

      await manager.ensureModel();

      expect(mkdirSpy).toHaveBeenCalledWith(
        expect.stringContaining('all-MiniLM-L6-v2'),
        { recursive: true }
      );
    });
  });

  describe('getModelName', () => {
    it('should return the model name', () => {
      expect(manager.getModelName()).toBe('all-MiniLM-L6-v2');
    });
  });

  describe('getHuggingFaceRepo', () => {
    it('should return the HuggingFace repository path', () => {
      expect(manager.getHuggingFaceRepo()).toBe('Xenova/all-MiniLM-L6-v2');
    });
  });
});
