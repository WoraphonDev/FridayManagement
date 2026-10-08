import type { ApiHooks } from './middleware.js';
import type { setupService } from '../services/setup.js';
export function setupHandlers(
  service: Awaited<ReturnType<typeof setupService>>,
): NonNullable<ApiHooks['handlers']> {
  return {
    get_api_meta: async () => ({ status: 200, body: await service.meta() }),
    post_api_setup: async (context) => ({
      status: 201,
      body: await service.create(
        context.body,
        context.request.ip ?? '',
        context.request.res?.get('X-Request-Id') ?? '',
      ),
    }),
  };
}
