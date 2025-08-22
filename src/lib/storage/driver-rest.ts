import { StorageDriver, PutResult, PresignResult } from './types'

// REST generic driver. Supports:
// - presign endpoint that returns { uploadUrl, method, headers, fields, key, publicUrl }
// - direct upload proxy (server will call PUT/POST)

export function createRestDriver(config: { baseUrl: string; headers?: Record<string,string>; extract?: { uploadUrlPath?: string; keyPath?: string; publicUrlPath?: string; methodPath?: string } }): StorageDriver {
  const baseHeaders = config.headers || {}
  function extractPath(obj: any, path?: string): any {
    if (!path) return undefined
    return path.split('.').reduce((acc, p) => (acc ? acc[p] : undefined), obj)
  }
  return {
    async put({ key, data, contentType }): Promise<PutResult> {
      // Direct proxy upload: send to config.baseUrl with multipart or octet-stream
      const res = await fetch(config.baseUrl, {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': contentType || 'application/octet-stream', 'X-File-Key': key },
        body: data as any,
      })
      if (!res.ok) throw new Error(`REST upload failed: ${res.status}`)
      const json = await res.json().catch(()=> ({}))
      const remoteKey = (extractPath(json, config.extract?.keyPath) as string) || key
      const publicUrl = extractPath(json, config.extract?.publicUrlPath) as string | undefined
      return { key: remoteKey, url: publicUrl || null, providerId: config.baseUrl }
    },
    async presign({ key }): Promise<PresignResult> {
      const res = await fetch(config.baseUrl, { method: 'POST', headers: { ...baseHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ key, action: 'presign' }) })
      if (!res.ok) throw new Error(`REST presign failed: ${res.status}`)
      const json = await res.json()
      const uploadUrl = (extractPath(json, config.extract?.uploadUrlPath) as string) || json.uploadUrl
      const method = (extractPath(json, config.extract?.methodPath) as any) || json.method || 'PUT'
      const publicUrl = (extractPath(json, config.extract?.publicUrlPath) as string) || json.publicUrl
      const out: PresignResult = { key, uploadUrl, method, headers: json.headers, fields: json.fields, publicUrl }
      return out
    },
    getPublicUrl(_key: string) { return null },
    async getSignedUrl(_key: string) { throw new Error('REST generic cannot sign without provider help') },
    async delete(key: string) {
      await fetch(config.baseUrl, { method: 'DELETE', headers: { ...baseHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) })
    },
    async health() { return { ok: true } },
  }
}
