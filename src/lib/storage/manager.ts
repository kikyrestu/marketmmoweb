import { StoragePool } from './pool'
import { StoragePoolConfig } from './types'

// Simple in-memory config for MVP. Later: persist in DB + admin UI.
const pools = new Map<string, StoragePool>()

export function registerPools(configs: StoragePoolConfig[]) {
  pools.clear()
  for (const cfg of configs) {
    pools.set(cfg.name, new StoragePool(cfg))
  }
}

export function getPool(name: string): StoragePool {
  const p = pools.get(name)
  if (!p) throw new Error(`Pool not found: ${name}`)
  return p
}

export function hasPool(name: string) { return pools.has(name) }

export function listPools(): StoragePool[] { return Array.from(pools.values()) }
