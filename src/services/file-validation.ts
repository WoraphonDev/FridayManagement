import { open } from 'node:fs/promises';
import { ApiFault } from '../api/errors.js';
const types: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export function normalizedName(input: string) {
  if (input.split(/[\\/]/).some((p) => p === '..') || /^[\\/]|^[a-z]:/i.test(input))
    throw new ApiFault('INVALID_FILE_TYPE');
  const name = input
    .split(/[\\/]/)
    .at(-1)!
    .replace(/[\x00-\x1f\x7f]/g, '')
    .normalize('NFC')
    .trim();
  const ext = name.split('.').at(-1)!.toLowerCase();
  if (
    !name ||
    name.length > 200 ||
    name === '.' ||
    name === '..' ||
    !types[ext] ||
    !name.includes('.')
  )
    throw new ApiFault('INVALID_FILE_TYPE');
  return { name, ext, type: types[ext]! };
}
/** Bounded reads and ZIP directory inspection; no archive extraction or full-file buffering. */
export async function validateFile(path: string, ext: string, bytes: number) {
  const handle = await open(path, 'r');
  const read = async (offset: number, size: number) => {
    if (offset < 0 || size < 0 || offset + size > bytes) throw new ApiFault('INVALID_FILE_TYPE');
    const b = Buffer.alloc(size);
    const r = await handle.read(b, 0, size, offset);
    if (r.bytesRead !== size) throw new ApiFault('INVALID_FILE_TYPE');
    return b;
  };
  try {
    const head = await read(0, Math.min(64, bytes));
    let valid = false;
    if (ext === 'jpg' || ext === 'jpeg')
      valid =
        head.subarray(0, 3).equals(Buffer.from([255, 216, 255])) &&
        bytes >= 4 &&
        (await read(bytes - 2, 2)).equals(Buffer.from([255, 217]));
    else if (ext === 'png')
      valid =
        bytes >= 33 &&
        head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        head.toString('ascii', 12, 16) === 'IHDR' &&
        head.readUInt32BE(16) > 0 &&
        head.readUInt32BE(20) > 0 &&
        (await read(bytes - 12, 12)).subarray(4, 8).toString('ascii') === 'IEND';
    else if (ext === 'webp')
      valid =
        bytes >= 20 &&
        head.toString('ascii', 0, 4) === 'RIFF' &&
        head.toString('ascii', 8, 12) === 'WEBP' &&
        ['VP8 ', 'VP8L', 'VP8X'].includes(head.toString('ascii', 12, 16)) &&
        head.readUInt32LE(4) + 8 === bytes;
    else if (ext === 'pdf')
      valid =
        head.toString('ascii', 0, 5) === '%PDF-' &&
        (await read(Math.max(0, bytes - 1024), Math.min(bytes, 1024))).includes(
          Buffer.from('%%EOF'),
        );
    else if (ext === 'txt' || ext === 'csv') {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      try {
        for (let offset = 0; offset < bytes; offset += 65536) {
          const text = decoder.decode(await read(offset, Math.min(65536, bytes - offset)), {
            stream: true,
          });
          if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) throw new Error('binary');
        }
        decoder.decode();
        valid = true;
      } catch {
        throw new ApiFault('INVALID_FILE_TYPE');
      }
    } else {
      const tail = await read(Math.max(0, bytes - 65557), Math.min(bytes, 65557));
      let end = -1;
      for (let i = tail.length - 22; i >= 0; i--)
        if (
          tail.readUInt32LE(i) === 0x06054b50 &&
          i + 22 + tail.readUInt16LE(i + 20) === tail.length
        ) {
          end = i;
          break;
        }
      if (end < 0 || tail.readUInt16LE(end + 4) || tail.readUInt16LE(end + 6))
        throw new ApiFault('INVALID_FILE_TYPE');
      const count = tail.readUInt16LE(end + 10),
        size = tail.readUInt32LE(end + 12),
        start = tail.readUInt32LE(end + 16),
        absoluteEnd = bytes - tail.length + end;
      if (
        count > 10000 ||
        count !== tail.readUInt16LE(end + 8) ||
        start + size !== absoluteEnd ||
        ![0x04034b50, 0x06054b50].includes(head.length >= 4 ? head.readUInt32LE(0) : 0)
      )
        throw new ApiFault('INVALID_FILE_TYPE');
      let pos = start;
      const names = new Set<string>();
      for (let i = 0; i < count; i++) {
        const h = await read(pos, 46);
        if (
          h.readUInt32LE(0) !== 0x02014b50 ||
          h.readUInt16LE(8) & 1 ||
          ![0, 8].includes(h.readUInt16LE(10))
        )
          throw new ApiFault('INVALID_FILE_TYPE');
        const n = h.readUInt16LE(28),
          extra = h.readUInt16LE(30),
          comment = h.readUInt16LE(32),
          local = h.readUInt32LE(42),
          packed = h.readUInt32LE(20);
        const name = (await read(pos + 46, n)).toString('utf8');
        names.add(name);
        if (local + 30 > start) throw new ApiFault('INVALID_FILE_TYPE');
        const lh = await read(local, 30);
        if (
          lh.readUInt32LE(0) !== 0x04034b50 ||
          local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28) + packed > start
        )
          throw new ApiFault('INVALID_FILE_TYPE');
        pos += 46 + n + extra + comment;
        if (pos > absoluteEnd) throw new ApiFault('INVALID_FILE_TYPE');
      }
      const office: Record<string, string> = {
        docx: 'word/document.xml',
        xlsx: 'xl/workbook.xml',
        pptx: 'ppt/presentation.xml',
      };
      valid =
        pos === absoluteEnd &&
        (ext === 'zip' || (names.has('[Content_Types].xml') && names.has(office[ext]!)));
    }
    if (!valid) throw new ApiFault('INVALID_FILE_TYPE');
  } finally {
    await handle.close();
  }
}
