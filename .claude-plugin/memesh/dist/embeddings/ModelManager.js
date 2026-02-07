import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
export class ModelManager {
    static MODEL_NAME = 'all-MiniLM-L6-v2';
    static HUGGINGFACE_REPO = 'Xenova/all-MiniLM-L6-v2';
    static REQUIRED_FILES = [
        'model.onnx',
        'tokenizer.json',
        'tokenizer_config.json',
        'config.json',
    ];
    modelDir;
    constructor() {
        this.modelDir = this.resolveModelDir();
    }
    getModelDir() {
        return this.modelDir;
    }
    getModelName() {
        return ModelManager.MODEL_NAME;
    }
    getHuggingFaceRepo() {
        return ModelManager.HUGGINGFACE_REPO;
    }
    getRequiredFiles() {
        return [...ModelManager.REQUIRED_FILES];
    }
    async isModelDownloaded() {
        for (const file of ModelManager.REQUIRED_FILES) {
            const filePath = path.join(this.modelDir, file);
            if (!fs.existsSync(filePath)) {
                logger.debug('Model file missing', { file, path: filePath });
                return false;
            }
        }
        return true;
    }
    getModelFilePath(filename) {
        return path.join(this.modelDir, filename);
    }
    async ensureModel() {
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
    async downloadModel() {
        fs.mkdirSync(this.modelDir, { recursive: true });
        logger.info('Model directory prepared. Model will be downloaded on first use.', {
            modelDir: this.modelDir,
            repo: ModelManager.HUGGINGFACE_REPO,
        });
    }
    resolveModelDir() {
        if (process.env.MEMESH_MODEL_DIR) {
            return path.join(process.env.MEMESH_MODEL_DIR, ModelManager.MODEL_NAME);
        }
        const baseDir = path.join(this.getDataDir(), 'models');
        return path.join(baseDir, ModelManager.MODEL_NAME);
    }
    getDataDir() {
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
                return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'memesh');
        }
    }
}
//# sourceMappingURL=ModelManager.js.map