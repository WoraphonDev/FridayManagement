import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('../TeamFlow_UI_Vibe_Preview.html', import.meta.url));
const server = createServer(async (req, res) => {
  if (
    !['/', '/TeamFlow_UI_Vibe_Preview.html'].includes(req.url) ||
    !['GET', 'HEAD'].includes(req.method)
  ) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const html = await readFile(file);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : html);
  } catch {
    res.writeHead(503);
    res.end('Build preview first');
  }
});
server.listen(43191, '127.0.0.1', () =>
  console.log('Vibe preview: http://127.0.0.1:43191/TeamFlow_UI_Vibe_Preview.html'),
);
