import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

class LocalStorageProvider {
  constructor() {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  async save(file) {
    return { url: `/uploads/${file.filename}`, key: file.filename };
  }

  async remove(key) {
    if (!key || key.includes('..') || key.startsWith('seed/')) return;
    const target = path.join(config.uploadDir, key);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
}

export const storage = new LocalStorageProvider();
