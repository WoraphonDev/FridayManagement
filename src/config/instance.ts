import { createServer, type Server } from 'node:net';
import { createHash } from 'node:crypto';
import type { AppConfig } from './config.js';

/**
 * Kernel-owned local guard, released on exit/crash; never steal a stale PID file or another project's port.
 * The port lies in 20000–31999, below every OS ephemeral range (Linux 32768+, macOS/Windows 49152+):
 * an outbound connection (e.g. a database socket) can never occupy it and fail startup.
 */
export function localInstancePort(config: AppConfig): number {
  const resource =
    config.database.provider === 'sqlite'
      ? config.database.path
      : `${config.database.server.toLowerCase()}:${config.database.port}/${config.database.name.toLowerCase()}`;
  return (
    20000 +
    (createHash('sha256')
      .update(
        `FridayManagement:${process.platform === 'win32' ? resource.toLowerCase() : resource}`,
      )
      .digest()
      .readUInt32BE(0) %
      12000)
  );
}
export async function acquireLocalInstance(config: AppConfig): Promise<() => Promise<void>> {
  const server: Server = createServer((socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => {
    server.once('error', () => reject(new Error('INSTANCE_GUARD_UNAVAILABLE')));
    server.listen({ host: '127.0.0.1', port: localInstancePort(config), exclusive: true }, () =>
      resolve(),
    );
  });
  return () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
}
