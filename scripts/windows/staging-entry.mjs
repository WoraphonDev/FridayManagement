// Direct Node child of WinSW so Ctrl+C reaches main.ts graceful SIGINT handler.
import '../check-runtime.mjs';
await import('./preflight.mjs');
if (!process.exitCode) await import('../../dist/server/api/main.js');
