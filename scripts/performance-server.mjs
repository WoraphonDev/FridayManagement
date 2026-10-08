// QA-only IPC child: compiled API in a separate process, synthetic fixture only.
import { startApplication } from '../dist/server/api/start.js';
if (!process.send || process.env.FRIDAY_ISOLATED_MEMORY_CHILD !== '1' || !global.gc)
  throw new Error('ISOLATED_MEMORY_CHILD_REQUIRED');
const app = await startApplication(process.env);
process.send({ type: 'ready' });
process.on('message', async (message) => {
  if (!message || !Number.isInteger(message.id)) return;
  try {
    if (message.type === 'sample') {
      if (message.forceGC === true) {
        global.gc();
        await new Promise((resolve) => setImmediate(resolve));
        global.gc();
      }
      process.send?.({ id: message.id, memory: process.memoryUsage() });
    } else if (message.type === 'stop') {
      await app.stop();
      process.send?.({ id: message.id, stopped: true });
      process.disconnect();
    }
  } catch {
    process.send?.({ id: message.id, error: 'MEMORY_CHILD_OPERATION_FAILED' });
  }
});
process.once('disconnect', async () => {
  await app.stop();
});
process.once('SIGTERM', async () => {
  await app.stop();
  process.disconnect?.();
});
