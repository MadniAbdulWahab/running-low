/**
 * Reads the camera's lens name from a JPEG's EXIF data, e.g. "iPhone 15 front camera 2.69mm f/1.9".
 * Returns null when there's no EXIF (not a JPEG, or the metadata was stripped).
 */
export async function lensModel(file: Blob): Promise<string | null> {
  try {
    return findLensModel(new DataView(await file.slice(0, 256 * 1024).arrayBuffer()))
  } catch {
    return null
  }
}

const LENS_MODEL = 0xa434
const EXIF_IFD = 0x8769

export function findLensModel(v: DataView): string | null {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null // not a JPEG
  let p = 2
  while (p + 4 <= v.byteLength) {
    const marker = v.getUint16(p)
    const len = v.getUint16(p + 2)
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null // start of image data: no EXIF
    if (marker === 0xffe1 && v.getUint32(p + 4) === 0x45786966) return readTiff(v, p + 10) // "Exif\0\0"
    p += 2 + len
  }
  return null
}

function readTiff(v: DataView, t: number): string | null {
  const le = v.getUint16(t) === 0x4949 // "II" little-endian, else "MM"
  const u16 = (o: number) => v.getUint16(t + o, le)
  const u32 = (o: number) => v.getUint32(t + o, le)
  const tag = (ifd: number, want: number) => {
    const n = u16(ifd)
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12
      if (u16(e) === want) return e
    }
    return -1
  }
  const ifd0 = u32(4)
  const ptr = tag(ifd0, EXIF_IFD)
  if (ptr < 0) return null
  const exif = u32(ptr + 8)
  const e = tag(exif, LENS_MODEL)
  if (e < 0) return null
  const count = u32(e + 4)
  const at = count <= 4 ? e + 8 : u32(e + 8)
  let s = ''
  for (let i = 0; i < count; i++) {
    const c = v.getUint8(t + at + i)
    if (!c) break
    s += String.fromCharCode(c)
  }
  return s || null
}
