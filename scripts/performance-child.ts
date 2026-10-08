import { fork, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
export type Memory = ReturnType<typeof process.memoryUsage>;
export async function startMemoryServer(env: NodeJS.ProcessEnv) {
  const child: ChildProcess = fork(join(process.cwd(), 'scripts/performance-server.mjs'), [], {
    execArgv: ['--expose-gc'],
    env: { ...env, FRIDAY_ISOLATED_MEMORY_CHILD: '1' },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  let id = 0;
  const request = (type: string, forceGC = false): Promise<{ memory?: Memory }> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => done(new Error('MEMORY_CHILD_TIMEOUT')), 10000);
      const receive = (value: { id?: number; error?: string; memory?: Memory }) => {
        if (value.id === next) done(value.error ? new Error(value.error) : undefined, value);
      };
      const exited = () => done(new Error('MEMORY_CHILD_EXITED'));
      const done = (error?: Error, value?: { memory?: Memory }) => {
        clearTimeout(timer);
        child.off('message', receive);
        child.off('exit', exited);
        if (error) reject(error);
        else resolve(value!);
      };
      const next = ++id;
      child.on('message', receive);
      child.once('exit', exited);
      child.send({ id: next, type, forceGC }, (error) => {
        if (error) done(error);
      });
    });
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    try {
      if (child.connected) await request('stop');
    } catch {
      child.kill('SIGTERM');
    }
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timer);
  };
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => done(new Error('MEMORY_CHILD_START_TIMEOUT')), 10000);
      const receive = (value: { type?: string }) => {
        if (value.type === 'ready') done();
      };
      const exited = () => done(new Error('MEMORY_CHILD_START_FAILED'));
      const done = (error?: Error) => {
        clearTimeout(timer);
        child.off('message', receive);
        child.off('exit', exited);
        if (error) reject(error);
        else resolve();
      };
      child.on('message', receive);
      child.once('exit', exited);
    });
  } catch (error) {
    await stop();
    throw error;
  }
  return { stop, sample: async (forceGC = false) => (await request('sample', forceGC)).memory! };
}
