/**
 * ImageKit client — lazy, and optional.
 *
 * Upstream instantiated `new ImageKit({ privateKey })` at import time, which
 * throws the moment the module loads if IMAGEKIT_PRIVATE_KEY is unset. That made
 * the whole API un-bootable without media credentials. Here the client is built
 * on first use and the app degrades to a local-disk shim instead of dying, so
 * proof-vault uploads work offline and in CI.
 */
import ImageKit from '@imagekit/nodejs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const imageKitConfigured = () => Boolean(process.env.IMAGEKIT_PRIVATE_KEY)

let client = null

export function getImageKit() {
  if (!imageKitConfigured()) return null
  client ??= new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  })
  return client
}

/**
 * Uploads a proof artefact. Returns { url, fileId, provider }.
 * With ImageKit configured, media lands on the CDN; without it, the file is
 * written under .uploads/ and served from /media so the flow stays testable.
 */
export async function uploadProof(file, { folder = '/reachmark/proof' } = {}) {
  const ik = getImageKit()
  if (ik) {
    const res = await ik.files.upload({
      file: file.buffer ?? file.path ?? file,
      fileName: file.originalname ?? `proof-${Date.now()}.png`,
      folder,
    })
    return { url: res.url, fileId: res.fileId, provider: 'imagekit' }
  }

  const dir = resolve(process.cwd(), '.uploads')
  mkdirSync(dir, { recursive: true })
  const name = `${Date.now()}-${(file.originalname ?? 'proof.png').replace(/[^\w.-]/g, '_')}`
  const target = join(dir, name)
  writeFileSync(target, file.buffer ?? Buffer.from(''))
  return { url: `/media/${name}`, fileId: `local_${name}`, provider: 'local' }
}

export default { getImageKit, uploadProof, imageKitConfigured }
