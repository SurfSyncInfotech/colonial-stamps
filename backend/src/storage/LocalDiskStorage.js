import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider } from './StorageProvider.js';
import { env } from '../config/env.js';

export class LocalDiskStorage extends StorageProvider {
  constructor() {
    super();
    this.baseDir = path.resolve(env.uploadDir);
  }

  async ensureDir(folder) {
    const dir = path.join(this.baseDir, folder);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async save(file, folder = 'products') {
    const dir = await this.ensureDir(folder);
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, file.buffer);
    return { filename: `${folder}/${filename}`, url: this.getUrl(`${folder}/${filename}`) };
  }

  getUrl(filename) {
    return `/uploads/${filename.replace(/\\/g, '/')}`;
  }

  async delete(filename) {
    const filepath = path.join(this.baseDir, filename);
    try {
      await fs.unlink(filepath);
    } catch {
      /* ignore missing */
    }
  }
}
