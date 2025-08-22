import { StorageDriver, StoragePoolConfig, StorageProviderConfig, PutResult, PresignResult } from './types'
import { createRestDriver } from './driver-rest'
import { createS3Driver } from './driver-s3'
import { createFileDriver } from './driver-file'

function parseUrlToDriver(p: StorageProviderConfig): StorageDriver {
  // Prefer explicit type when provided
  if (p.type === 'file') {
    let publicBase = '/' + (p.url.startsWith('public/') ? p.url.substring(7 - 1) /* 'public/'.length */ : p.url)
    // fix double slashes and ensure trailing slash
    publicBase = publicBase.replace(/\/+/g, '/').replace(/\/$/, '') + '/'
    return createFileDriver({ baseDir: p.url, publicBase })
  }
  if (p.type === 'rest') {
    return createRestDriver({ baseUrl: p.url, headers: p.headers || {} })
  }
  if (p.type === 's3') {
    try {
      const u = new URL(p.url)
      const bucket = u.hostname
      const region = u.searchParams.get('region') || undefined
      const publicBaseUrl = u.searchParams.get('publicBase') || undefined
      return createS3Driver({ bucket, region, publicBaseUrl })
    } catch {
      return createS3Driver({ bucket: p.url })
    }
  }
  try {
    const u = new URL(p.url)
    if (u.protocol === 's3:') {
      const bucket = u.hostname
      const region = u.searchParams.get('region') || undefined
      const publicBaseUrl = u.searchParams.get('publicBase') || undefined
      return createS3Driver({ bucket, region, publicBaseUrl })
    }
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return createRestDriver({ baseUrl: p.url, headers: p.headers || {} })
    }
    // fallback
    return createRestDriver({ baseUrl: p.url })
  } catch {
    return createRestDriver({ baseUrl: p.url })
  }
}

export class StoragePool {
  private cfg: StoragePoolConfig
  private drivers: { cfg: StorageProviderConfig; driver: StorageDriver; healthy: boolean; errors: number }[]
  private rrIndex = 0

  constructor(cfg: StoragePoolConfig) {
    this.cfg = cfg
    this.drivers = cfg.providers.map(p => ({ cfg: p, driver: parseUrlToDriver(p), healthy: true, errors: 0 }))
  }

  get name() { return this.cfg.name }
  get visibility() { return this.cfg.visibility }
  get strategy() { return this.cfg.strategy || 'round-robin' }

  private pickProvider(): number {
    const active = this.drivers.filter(d=> d.healthy)
    if (active.length === 0) return 0
    if ((this.cfg.strategy || 'round-robin') === 'weighted') {
      const arr: number[] = []
      this.drivers.forEach((d, idx) => {
        const w = d.cfg.weight && d.cfg.weight > 0 ? d.cfg.weight : 1
        for (let i=0;i<w;i++) arr.push(idx)
      })
      const i = Math.floor(Math.random()*arr.length)
      return arr[i]
    }
    // round-robin
    const i = this.rrIndex % active.length
    const chosen = this.drivers.indexOf(active[i])
    this.rrIndex++
    return chosen >=0 ? chosen : 0
  }

  async healthCheck() {
    await Promise.all(this.drivers.map(async (d) => {
      try { const h = await d.driver.health?.(); d.healthy = h?.ok ?? true } catch { d.healthy = false }
    }))
  }

  async put(key: string, data: Blob | Buffer | Uint8Array, contentType?: string): Promise<PutResult> {
    const tried = new Set<number>()
    let lastErr: any
    while (tried.size < this.drivers.length) {
      const idx = this.pickProvider()
      if (tried.has(idx)) { continue }
      tried.add(idx)
      const d = this.drivers[idx]
      try {
        const res = await d.driver.put({ key, data, contentType })
        d.errors = 0
        return { ...res, providerId: d.cfg.id }
      } catch (e) {
        d.errors++
        if (d.errors >= 3) d.healthy = false
        lastErr = e
      }
    }
    throw lastErr || new Error('All providers failed')
  }

  async presign(key: string, contentType?: string, size?: number): Promise<PresignResult> {
    const tried = new Set<number>()
    let lastErr: any
    while (tried.size < this.drivers.length) {
      const idx = this.pickProvider()
      if (tried.has(idx)) { continue }
      tried.add(idx)
      const d = this.drivers[idx]
      try {
        if (!d.driver.presign) throw new Error('Provider does not support presign')
        const res = await d.driver.presign({ key, contentType, size })
        d.errors = 0
        return { ...res }
      } catch (e) {
        d.errors++
        if (d.errors >= 3) d.healthy = false
        lastErr = e
      }
    }
    throw lastErr || new Error('All providers failed')
  }

  getPublicUrl(key: string): string | null {
    for (const d of this.drivers) {
      const u = d.driver.getPublicUrl?.(key)
      if (u) return u
    }
    return null
  }

  async getSignedUrl(key: string, expiresIn = 900): Promise<string> {
    for (const d of this.drivers) {
      if (d.driver.getSignedUrl) return await d.driver.getSignedUrl(key, expiresIn)
    }
    // fallback to public url
    const u = this.getPublicUrl(key)
    if (!u) throw new Error('No signed or public URL available')
    return u
  }

  async delete(key: string) {
    // best-effort delete across providers
    for (const d of this.drivers) {
      try { await d.driver.delete(key) } catch {}
    }
  }

  // Introspection for admin UI
  getInfo() {
    return {
      name: this.cfg.name,
      visibility: this.cfg.visibility,
      strategy: this.cfg.strategy || 'round-robin',
      providers: this.drivers.map(d => ({
        id: d.cfg.id,
        type: d.cfg.type,
        url: d.cfg.url,
        healthy: d.healthy,
        errors: d.errors,
      }))
    }
  }
}
