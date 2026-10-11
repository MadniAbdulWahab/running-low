import { describe, expect, it } from 'vitest'
import { findLensModel } from '../src/lib/exif'

/** A tiny JPEG header with an EXIF block holding just a LensModel tag. */
function jpegWithLens(lens: string, littleEndian = true): DataView {
  const str = [...lens].map((c) => c.charCodeAt(0)).concat(0)
  const tiff = new DataView(new ArrayBuffer(44 + str.length))
  const le = littleEndian
  tiff.setUint16(0, le ? 0x4949 : 0x4d4d)
  tiff.setUint16(2, 42, le)
  tiff.setUint32(4, 8, le)
  // IFD0: one entry pointing at the EXIF IFD (offset 26)
  tiff.setUint16(8, 1, le)
  tiff.setUint16(10, 0x8769, le)
  tiff.setUint16(12, 4, le)
  tiff.setUint32(14, 1, le)
  tiff.setUint32(18, 26, le)
  tiff.setUint32(22, 0, le)
  // EXIF IFD: LensModel, ASCII, stored at offset 44
  tiff.setUint16(26, 1, le)
  tiff.setUint16(28, 0xa434, le)
  tiff.setUint16(30, 2, le)
  tiff.setUint32(32, str.length, le)
  tiff.setUint32(36, 44, le)
  tiff.setUint32(40, 0, le)
  str.forEach((c, i) => tiff.setUint8(44 + i, c))

  const app1 = 2 + 6 + tiff.byteLength
  const out = new Uint8Array(2 + 2 + app1 + 4)
  out.set([0xff, 0xd8, 0xff, 0xe1, app1 >> 8, app1 & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0], 0)
  out.set(new Uint8Array(tiff.buffer), 12)
  out.set([0xff, 0xda, 0, 2], 12 + tiff.byteLength)
  return new DataView(out.buffer)
}

describe('EXIF lens model', () => {
  it('reads the front camera from an iPhone selfie (little- and big-endian)', () => {
    expect(findLensModel(jpegWithLens('iPhone 15 front camera 2.69mm f/1.9'))).toBe('iPhone 15 front camera 2.69mm f/1.9')
    expect(findLensModel(jpegWithLens('iPhone 15 back camera 6.1mm f/1.6', false))).toBe('iPhone 15 back camera 6.1mm f/1.6')
  })
  it('returns null without EXIF or for non-JPEGs', () => {
    expect(findLensModel(new DataView(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer))).toBeNull()
    expect(findLensModel(new DataView(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer))).toBeNull()
  })
})
