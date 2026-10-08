import { InstallerFault } from './authority.js';
/** Raw TTY only: passwords are never accepted as arguments, environment values, or redirected stdin. */
export async function hiddenPassword(
  prompt: string,
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stdout,
  signal?: AbortSignal,
): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function')
    throw new InstallerFault('INTERACTIVE_TTY_REQUIRED');
  if (signal?.aborted) throw new InstallerFault('INSTANCE_GUARD_LOST');
  const wasRaw = input.isRaw;
  input.setRawMode(true);
  input.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error?: InstallerFault) => {
      input.removeListener('data', data);
      input.removeListener('end', end);
      input.removeListener('error', end);
      signal?.removeEventListener('abort', abort);
      process.removeListener('SIGINT', end);
      process.removeListener('SIGTERM', end);
      input.setRawMode(wasRaw);
      input.pause();
      output.write('\n');
      const result = value;
      value = '';
      if (error) reject(error);
      else resolve(result);
    };
    const end = () => finish(new InstallerFault('INPUT_CANCELLED')),
      abort = () => finish(new InstallerFault('INSTANCE_GUARD_LOST'));
    const data = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u0003' || char === '\u0004' || char === '\u001b') {
          end();
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        if (char < ' ' && char !== '\t') {
          end();
          return;
        }
        value += char;
        if (Array.from(value).length > 128) {
          finish(new InstallerFault('PASSWORD_POLICY'));
          return;
        }
      }
    };
    process.once('SIGINT', end);
    process.once('SIGTERM', end);
    input.on('data', data);
    input.once('end', end);
    input.once('error', end);
    signal?.addEventListener('abort', abort, { once: true });
    output.write(prompt);
    input.resume();
  });
}
