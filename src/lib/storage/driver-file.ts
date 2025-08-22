import { StorageDriver, PutResult } from './types'
import fs from 'fs'
import path from 'path'

export function createFileDriver(config: { baseDir: string; publicBase?: string }): StorageDriver {
  const baseDir = path.isAbsolute(config.baseDir) ? config.baseDir : path.join(process.cwd(), config.baseDir)
  const publicBase = config.publicBase || '/'
  function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }
  return {
    async put({ key, data, contentType }): Promise<PutResult> {
      const filePath = path.join(baseDir, key)
      ensureDir(path.dirname(filePath))
      const buf = data instanceof Buffer ? data : Buffer.from(data as any)
      fs.writeFileSync(filePath, buf)
      const publicUrl = new URL(path.posix.join(publicBase, key), 'http://localhost').pathname
      return { key, url: publicUrl, providerId: `file:${baseDir}` }
    },
    async presign() { throw new Error('File driver does not support presign') },
    getPublicUrl(key: string) { return new URL(path.posix.join(publicBase, key), 'http://localhost').pathname },
  async getSignedUrl(key: string) { return Promise.resolve(this.getPublicUrl!(key) as string) },
    async delete(key: string) {
      try { fs.unlinkSync(path.join(baseDir, key)) } catch {}
    },
    async health() { return { ok: true } },
  }
}
