export type Visibility = 'public' | 'private'

export interface PutResult {
  key: string
  url?: string | null
  providerId: string
}

export interface PresignResult {
  key: string
  uploadUrl: string
  method?: 'PUT' | 'POST'
  headers?: Record<string, string>
  fields?: Record<string, string> // for POST forms
  publicUrl?: string | null
}

export interface StorageProviderConfig {
  id: string
  type: 's3' | 'rest' | 'file'
  url: string // e.g., s3://bucket?region=xxx or https://api.example.com/upload
  weight?: number
  headers?: Record<string, string>
  secretJsonEnc?: string // encrypted secrets
}

export interface StoragePoolConfig {
  name: string // e.g., PUBLIC_IMAGES
  visibility: Visibility
  strategy?: 'round-robin' | 'weighted'
  maxSizeBytes?: number
  allowedMime?: string[]
  providers: StorageProviderConfig[]
}

export interface StorageDriver {
  put(params: { key: string; data: Blob | Buffer | Uint8Array; contentType?: string }): Promise<PutResult>
  presign?(params: { key: string; contentType?: string; size?: number; expiresIn?: number }): Promise<PresignResult>
  getPublicUrl?(key: string): string | null
  getSignedUrl?(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  health?(): Promise<{ ok: boolean; message?: string }>
}
