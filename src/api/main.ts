import { startApplication, safeStartupError } from './start.js';

try {
  const app = await startApplication();
  console.log(JSON.stringify({ event: 'foundation_started' }));
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      void app.stop();
    });
} catch (error) {
  console.error(safeStartupError(error));
  process.exitCode = 1;
}
