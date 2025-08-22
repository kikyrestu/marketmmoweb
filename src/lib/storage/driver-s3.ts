import { StorageDriver, PutResult, PresignResult } from './types'

// Minimal S3-compatible driver using fetch + presigned URLs provided by external config.
// For MVP we assume REST generic or presign will be used; this driver stubs getPublicUrl by convention.

export function createS3Driver(config: { bucket: string; region?: string; publicBaseUrl?: string; credentials?: { accessKeyId: string; secretAccessKey: string } }) : StorageDriver {
  const publicBase = config.publicBaseUrl || `https://${config.bucket}.s3.${config.region}.amazonaws.com`
  return {
    async put({ key, data, contentType }): Promise<PutResult> {
      // In real impl, we would use AWS SDK or a presigned URL. For MVP, this is not used directly.
      throw new Error('Direct S3 put not implemented; use presign flow')
    },
    async presign({ key }): Promise<PresignResult> {
      // Placeholder: real presign should be done via AWS SDK. Caller should route to a presign-capable provider.
      throw new Error('S3 presign not wired in this MVP; use REST generic with provided presign endpoint')
    },
    getPublicUrl(key: string) {
      return `${publicBase}/${encodeURIComponent(key)}`
    },
    async getSignedUrl(key: string) {
      // Not available in MVP without SDK; fallback to public URL
      return `${publicBase}/${encodeURIComponent(key)}`
    },
    async delete(_key: string) {
      // Stub for MVP
      throw new Error('S3 delete not implemented in MVP')
    },
    async health() { return { ok: true } },
  }
}
