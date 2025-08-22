import { registerPools } from './manager'
import type { StoragePoolConfig } from './types'
import { readConfigFromStore } from './config-store'

let bootstrapped = false

export async function loadStorageConfigs(): Promise<StoragePoolConfig[]> {
  const configs: StoragePoolConfig[] = []

  // Try persisted store first
  const stored = await readConfigFromStore()
  if (stored && stored.length) return stored

  // Example: load from env (MVP). Later: fetch from DB / admin.
  const envPools = process.env.STORAGE_POOLS // JSON string
  if (envPools) {
    try {
      const parsed = JSON.parse(envPools)
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p && p.name && p.providers) configs.push(p)
        }
      }
    } catch {}
  }

  // Fallback default for dev: local REST receiver (expect 200 OK)
  if (configs.length === 0) {
    configs.push(
      {
        name: 'PUBLIC_IMAGES',
        visibility: 'public',
        strategy: 'round-robin',
        providers: [
          { id: 'dev-file', type: 'file', url: 'file:public/uploads' },
          { id: 'dev-rest-a', type: 'rest', url: 'http://localhost:8787/upload', weight: 2 },
        ],
      },
      {
        name: 'VERIFICATION',
        visibility: 'public',
        strategy: 'round-robin',
        providers: [ { id: 'dev-file-verify', type: 'file', url: 'file:public/uploads/verification' } ],
      },
      {
        name: 'COMMUNITY_ATTACHMENTS',
        visibility: 'public',
        strategy: 'round-robin',
        providers: [ { id: 'dev-file-comm', type: 'file', url: 'file:public/uploads/community' } ],
      },
    )
  }

  return configs
}

export function bootstrapStorage() {
  if (bootstrapped) return
  // Synchronously register from env/defaults; API pages that want to load from store should call loadAndRegister()
  const configs: StoragePoolConfig[] = []
  const envPools = process.env.STORAGE_POOLS
  if (envPools) {
    try {
      const parsed = JSON.parse(envPools)
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p && p.name && p.providers) configs.push(p)
        }
      }
    } catch {}
  }
  if (configs.length === 0) {
    configs.push(
      {
        name: 'PUBLIC_IMAGES',
        visibility: 'public',
        strategy: 'round-robin',
        providers: [
          { id: 'dev-file', type: 'file', url: 'public/uploads' },
          { id: 'dev-rest-a', type: 'rest', url: 'http://localhost:8787/upload', weight: 2 },
        ],
      },
      {
        name: 'VERIFICATION',
        visibility: 'public',
        strategy: 'round-robin',
        providers: [ { id: 'dev-file-verify', type: 'file', url: 'public/uploads/verification' } ],
      },
      {
        name: 'COMMUNITY_ATTACHMENTS',
        visibility: 'public',
        strategy: 'round-robin',
        providers: [ { id: 'dev-file-comm', type: 'file', url: 'public/uploads/community' } ],
      },
    )
  }
  registerPools(configs)
  bootstrapped = true
}

export async function loadAndRegisterStorage() {
  if (bootstrapped) return
  const cfgs = await loadStorageConfigs()
  registerPools(cfgs)
  bootstrapped = true
}
