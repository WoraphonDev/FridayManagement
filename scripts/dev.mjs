import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import './check-runtime.mjs';

if (!existsSync('node_modules/vite/bin/vite.js')) throw new Error('Run npm ci first');
const children = [
  spawn(process.execPath, ['--import','tsx','src/api/main.ts'], { stdio:'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js','--config','vite.config.ts'], { stdio:'inherit' }),
];
let stopping = false;
function stop() { if(stopping)return;stopping=true;children.forEach(child=>child.kill('SIGTERM')); }
for (const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
for (const child of children) {
  child.on('error',()=>{process.exitCode=1;stop();});
  child.on('exit',(code)=>{if(!stopping){process.exitCode=code??1;stop();}});
}
