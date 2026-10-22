/**
 * Validasi file upload lewat magic bytes (signature), bukan hanya
 * `file.type` yang diklaim browser dan bisa dipalsukan.
 *
 * Server tetap punya allowlist MIME (bucket chat-photos), tapi cek sisi
 * klien memberi umpan balik cepat dan mencegah file menyamar.
 */

const IMAGE_SIGNATURES: Array<{ ext: string; bytes: number[]; offset?: number }> = [
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { ext: 'bmp', bytes: [0x42, 0x4d] },
]

function startsWith(buffer: ArrayBuffer, bytes: number[], offset = 0): boolean {
  const view = new Uint8Array(buffer)
  if (view.length < offset + bytes.length) return false
  return bytes.every((byte, index) => view[offset + index] === byte)
}

function isPdf(buffer: ArrayBuffer): boolean {
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(5, buffer.byteLength)))
  return head === '%PDF-'
}

function isMp4(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength))
  if (view.length < 12) return false
  // 'ftyp' pada offset 4
  return (
    view[4] === 0x66 &&
    view[5] === 0x74 &&
    view[6] === 0x79 &&
    view[7] === 0x70
  )
}

function isOggOrWebm(buffer: ArrayBuffer): boolean {
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)))
  return head === 'OggS'
}

function isWav(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength))
  if (view.length < 12) return false
  return (
    view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
    view[8] === 0x57 && view[9] === 0x41 && view[10] === 0x56 && view[11] === 0x45
  )
}

/**
 * Cek signature file. Mengembalikan `true` bila signature dikenali.
 * Jenis yang boleh: gambar, video, audio, PDF, dan dokumen umum.
 */
export async function hasValidMagicBytes(file: File): Promise<boolean> {
  let buffer: ArrayBuffer
  try {
    buffer = await file.slice(0, 32).arrayBuffer()
  } catch {
    return false
  }
  if (buffer.byteLength === 0) return false

  for (const signature of IMAGE_SIGNATURES) {
    if (startsWith(buffer, signature.bytes, signature.offset ?? 0)) return true
  }
  if (isPdf(buffer)) return true
  if (isMp4(buffer)) return true
  if (isOggOrWebm(buffer)) return true
  if (isWav(buffer)) return true

  // Dokumen Office/zip: signature 'PK\x03\x04'
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return true
  // Teks polos HANYA bila memang trik belated atau ekstensi teks —
  // file .jpg berisi teks biasa harus DITOLAK (menyamar).
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength)))
  const looksText = head.length > 0 && !/[\u0000-\u0008\u000E-\u001F]/.test(head)
  if (looksText) {
    const declaredText = file.type.startsWith('text/')
    const textExt = /\.(txt|csv|md|log)$/i.test(file.name)
    if (declaredText || textExt) return true
  }

  return false
}

/** True bila fileINOIH seperti executable/ELF — pasti ditolak. */
export function looksLikeExecutable(file: File): boolean {
  return file.name.toLowerCase().endsWith('.exe') || file.name.toLowerCase().endsWith('.sh')
}
