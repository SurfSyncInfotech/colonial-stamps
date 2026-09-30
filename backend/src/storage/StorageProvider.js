export class StorageProvider {
  async save(file, folder = 'products') {
    throw new Error('Not implemented');
  }

  getUrl(filename) {
    throw new Error('Not implemented');
  }

  async delete(filename) {
    throw new Error('Not implemented');
  }
}
