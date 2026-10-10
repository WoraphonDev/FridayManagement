import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import type { AppConfig } from '../config/config.js';
import { apiMiddleware, type ApiHooks } from './middleware.js';
import { errorHandler, type SafeLog } from './errors.js';
import { queryFor } from './contract.js';
import { sessionCookie, sessionCookieOptions } from '../security/session-cookie.js';
import { localHealthRequest } from './health.js';

export function createApp(
  frontendDirectory = resolve('dist/frontend'),
  config?: AppConfig,
  hooks: ApiHooks = {},
  log?: SafeLog,
  health: {
    ready?: () => Promise<boolean>;
    request?: (event: { requestId: string; status: number }) => void;
  } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config?.trustedProxies ?? false);
  app.locals.appOrigin = config?.origin;
  app.use((request, response, next) => {
    response.set('X-Request-Id', randomUUID());
    response.once('finish', () =>
      health.request?.({
        requestId: String(response.getHeader('X-Request-Id')),
        status: response.statusCode,
      }),
    );
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('X-Frame-Options', 'DENY');
    response.set('Referrer-Policy', 'same-origin');
    response.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    response.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.set('Cross-Origin-Resource-Policy', 'same-origin');
    response.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    );
    if (config?.mode === 'production' && config.cookieSecure && request.secure)
      response.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.get('/health/live', (request, response) => {
    queryFor(
      'GET',
      '/health/live',
      new URLSearchParams(request.originalUrl.split('?').slice(1).join('?')),
    );
    response.json({ status: 'ok' });
  });
  app.get('/health/ready', async (request, response) => {
    queryFor(
      'GET',
      '/health/ready',
      new URLSearchParams(request.originalUrl.split('?').slice(1).join('?')),
    );
    let ready = false;
    if (localHealthRequest(request) && health.ready) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        ready = await Promise.race([
          health.ready(),
          new Promise<boolean>((resolve) => {
            timeout = setTimeout(() => resolve(false), 5000);
          }),
        ]);
      } catch {
        /* Status only, never diagnostics. */
      } finally {
        clearTimeout(timeout);
      }
    }
    if (ready) response.json({ status: 'ok' });
    else response.set('Retry-After', '5').status(503).json({ status: 'not_ready' });
  });
  app.use('/api', apiMiddleware({ ...hooks, ...(config ? { origin: config.origin } : {}) }));
  if (existsSync(resolve(frontendDirectory, 'index.html'))) {
    app.use(express.static(frontendDirectory, { dotfiles: 'deny', index: false }));
    app.get(
      [
        '/',
        '/my-tasks',
        '/projects',
        '/calendar',
        '/reports',
        '/notifications',
        '/teams',
        '/trash',
        '/users',
        '/settings',
        /^\/projects\/[1-9][0-9]{0,9}\/tasks\/[1-9][0-9]{0,9}$/,
      ],
      (_request, response) => {
        response.sendFile(resolve(frontendDirectory, 'index.html'));
      },
    );
  }
  app.use((_request, response) => {
    response.sendStatus(404);
  });
  app.use(
    errorHandler(
      log,
      config
        ? (response) => {
            response.clearCookie(sessionCookie, sessionCookieOptions(config.cookieSecure));
          }
        : undefined,
    ),
  );
  return app;
}
