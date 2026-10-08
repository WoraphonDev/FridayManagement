import { Readable } from 'node:stream';
import type { Request } from 'express';
import type { fileService } from '../../src/services/files.js';
import type { SessionProof } from '../../src/services/authorization.js';
export function multipart(name: string, bytes: Buffer, extra = '', headers = '') {
  const boundary = 'friday-file-fixture';
  const input = Readable.from([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n${headers}\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n${extra}--${boundary}--\r\n`),
  ]);
  Object.assign(input, {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  });
  return input as unknown as Request;
}
export const receive = (
  s: Awaited<ReturnType<typeof fileService>>,
  proof: SessionProof,
  bytes = Buffer.from('file content'),
  name = 'file.txt',
) => s.receive(multipart(name, bytes), proof, 1);
/** Minimal standard ZIP directory fixture; validation never inflates these entries. */
export function archive(names: string[]) {
  const locals: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const name of names) {
    const n = Buffer.from(name),
      l = Buffer.alloc(30),
      c = Buffer.alloc(46);
    l.writeUInt32LE(0x04034b50);
    l.writeUInt16LE(20, 4);
    l.writeUInt16LE(n.length, 26);
    c.writeUInt32LE(0x02014b50);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(offset, 42);
    locals.push(l, n);
    central.push(c, n);
    offset += l.length + n.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
