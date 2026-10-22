import { describe, expect, it } from 'vitest'
import { hasValidMagicBytes, looksLikeExecutable } from '@/lib/upload-validate'

function fileOf(bytes: number[], name = 'x.bin', type = ''): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
const ZIP = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]
const MP4 = [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]
const ELF = [0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]

describe('hasValidMagicBytes', () => {
  it('menerima signature gambar', async () => {
    expect(await hasValidMagicBytes(fileOf(JPEG, 'a.jpg', 'image/jpeg'))).toBe(true)
    expect(await hasValidMagicBytes(fileOf(PNG, 'a.png', 'image/png'))).toBe(true)
    expect(await hasValidMagicBytes(fileOf(GIF, 'a.gif', 'image/gif'))).toBe(true)
  })

  it('menerima pdf, zip, mp4', async () => {
    expect(await hasValidMagicBytes(fileOf(PDF, 'a.pdf', 'application/pdf'))).toBe(true)
    expect(await hasValidMagicBytes(fileOf(ZIP, 'a.zip', 'application/zip'))).toBe(true)
    expect(await hasValidMagicBytes(fileOf(MP4, 'a.mp4', 'video/mp4'))).toBe(true)
  })

  it('menolak file yang menyamar (teks dengan ekstensi .jpg)', async () => {
    const fake = fileOf([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64], 'virus.jpg', 'image/jpeg')
    expect(await hasValidMagicBytes(fake)).toBe(false)
  })

  it('menolak binary executable', async () => {
    expect(await hasValidMagicBytes(fileOf(ELF, 'x.bin'))).toBe(false)
  })

  it('menolak file kosong', async () => {
    expect(await hasValidMagicBytes(fileOf([], 'empty.jpg'))).toBe(false)
  })
})

describe('looksLikeExecutable', () => {
  it('menandai ekstensi executable', () => {
    expect(looksLikeExecutable(fileOf(JPEG, 'run.exe'))).toBe(true)
    expect(looksLikeExecutable(fileOf(JPEG, 'run.sh'))).toBe(true)
    expect(looksLikeExecutable(fileOf(JPEG, 'photo.jpg'))).toBe(false)
  })
})
