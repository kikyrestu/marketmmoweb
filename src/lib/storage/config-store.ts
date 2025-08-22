import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import type { StoragePoolConfig } from './types'

function getStorePath() {
  const p = process.env.STORAGE_POOLS_FILE || '.data/storage-pools.json'
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p)
  const dir = path.dirname(abs)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return abs
}

export async function readConfigFromStore(): Promise<StoragePoolConfig[] | null> {
  try {
    const file = getStorePath()
    if (!fs.existsSync(file)) return null
    const raw = await fsp.readFile(file, 'utf8')
    const json = JSON.parse(raw)
    if (!Array.isArray(json)) return null
    return json
  } catch {
    return null
  }
}

export async function writeConfigToStore(configs: StoragePoolConfig[]): Promise<void> {
  const file = getStorePath()
  await fsp.writeFile(file, JSON.stringify(configs, null, 2), 'utf8')
}
