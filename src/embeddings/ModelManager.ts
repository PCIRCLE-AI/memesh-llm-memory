/**
 * ModelManager - ONNX Embedding Model Download and Management
 *
 * Handles downloading and validating the all-MiniLM-L6-v2 ONNX embedding model
 * from HuggingFace. Provides cross-platform model directory resolution and
 * model file validation.
 *
 * The model is used by EmbeddingService to generate 384-dimensional vectors
 * for semantic search capabilities in MeMesh.
 *
 * @example
 * ```typescript
 * const manager = new ModelManager();
 *
 * // Check if model is ready
 * if (await manager.isModelDownloaded()) {
 *   const modelPath = manager.getModelFilePath('model.onnx');
 *   // Use model...
 * }
 *
 * // Or ensure model is available (downloads if needed)
 * const modelDir = await manager.ensureModel();
 * ```
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

/**
 * Manages ONNX embedding model download and validation
 *
 * Supports environment variable overrides:
 * - MEMESH_MODEL_DIR: Override model directory location
 * - MEMESH_DATA_DIR: Override base data directory
 */
export class ModelManager {
  /**
   * Model identifier - all-MiniLM-L6-v2
   * A lightweight, efficient sentence transformer model
   * Produces 384-dimensional embeddings
   */
  private static readonly MODEL_NAME = 'all-MiniLM-L6-v2';

  /**
   * HuggingFace repository for the ONNX model
   * Using Xenova's transformers.js compatible version
   */
  private static readonly HUGGINGFACE_REPO = 'Xenova/all-MiniLM-L6-v2';

  /**
   * Files required for the model to function
   * These are checked by isModelDownloaded()
   */
  private static readonly REQUIRED_FILES = [
    'model.onnx',
    'tokenizer.json',
    'tokenizer_config.json',
    'config.json',
  ];

  private modelDir: string;

  constructor() {
    this.modelDir = this.resolveModelDir();
  }

  /**
   * Get the model directory path
   * @returns Absolute path to the model directory
   */
  getModelDir(): string {
    return this.modelDir;
  }

  /**
   * Get the model name
   * @returns Model identifier string
   */
  getModelName(): string {
    return ModelManager.MODEL_NAME;
  }

  /**
   * Get the HuggingFace repository path
   * @returns HuggingFace repo path (e.g., 'Xenova/all-MiniLM-L6-v2')
   */
  getHuggingFaceRepo(): string {
    return ModelManager.HUGGINGFACE_REPO;
  }

  /**
   * Get list of required model files
   * @returns Copy of the required files array
   */
  getRequiredFiles(): string[] {
    return [...ModelManager.REQUIRED_FILES];
  }

  /**
   * Check if model is already downloaded and all required files exist
   * @returns true if all required files are present
   */
  async isModelDownloaded(): Promise<boolean> {
    for (const file of ModelManager.REQUIRED_FILES) {
      const filePath = path.join(this.modelDir, file);
      if (!fs.existsSync(filePath)) {
        logger.debug('Model file missing', { file, path: filePath });
        return false;
      }
    }
    return true;
  }

  /**
   * Get path to specific model file
   * @param filename - Name of the file (e.g., 'model.onnx')
   * @returns Absolute path to the file
   */
  getModelFilePath(filename: string): string {
    return path.join(this.modelDir, filename);
  }

  /**
   * Ensure model is downloaded and ready to use
   *
   * If model is already downloaded, returns immediately.
   * Otherwise, prepares the model directory for download.
   *
   * Note: Actual model download happens on first use via @xenova/transformers
   * which handles HuggingFace downloads transparently.
   *
   * @returns Path to model directory
   */
  async ensureModel(): Promise<string> {
    if (await this.isModelDownloaded()) {
      logger.debug('Model already downloaded', { modelDir: this.modelDir });
      return this.modelDir;
    }

    logger.info('Preparing embedding model...', {
      model: ModelManager.MODEL_NAME,
      repo: ModelManager.HUGGINGFACE_REPO,
    });
    await this.downloadModel();
    return this.modelDir;
  }

  /**
   * Download model from HuggingFace
   *
   * Creates the model directory structure. The actual model files
   * will be downloaded by @xenova/transformers on first use.
   */
  private async downloadModel(): Promise<void> {
    // Create model directory
    fs.mkdirSync(this.modelDir, { recursive: true });

    // Note: @xenova/transformers handles the actual download
    // The model will be downloaded on first use of the tokenizer/model
    logger.info('Model directory prepared. Model will be downloaded on first use.', {
      modelDir: this.modelDir,
      repo: ModelManager.HUGGINGFACE_REPO,
    });
  }

  /**
   * Resolve model directory based on environment or default
   *
   * Priority:
   * 1. MEMESH_MODEL_DIR environment variable
   * 2. MEMESH_DATA_DIR/models
   * 3. Platform-specific default location
   */
  private resolveModelDir(): string {
    // Direct model directory override
    if (process.env.MEMESH_MODEL_DIR) {
      return path.join(process.env.MEMESH_MODEL_DIR, ModelManager.MODEL_NAME);
    }

    // Use data directory as base
    const baseDir = path.join(this.getDataDir(), 'models');
    return path.join(baseDir, ModelManager.MODEL_NAME);
  }

  /**
   * Get platform-specific data directory
   *
   * - Windows: %APPDATA%/MeMesh
   * - macOS: ~/Library/Application Support/MeMesh
   * - Linux: $XDG_CONFIG_HOME/memesh or ~/.config/memesh
   */
  private getDataDir(): string {
    if (process.env.MEMESH_DATA_DIR) {
      return process.env.MEMESH_DATA_DIR;
    }

    const home = os.homedir();
    switch (os.platform()) {
      case 'win32':
        return path.join(process.env.APPDATA || home, 'MeMesh');
      case 'darwin':
        return path.join(home, 'Library', 'Application Support', 'MeMesh');
      default:
        // Linux and other Unix-like systems
        return path.join(
          process.env.XDG_CONFIG_HOME || path.join(home, '.config'),
          'memesh'
        );
    }
  }
}
