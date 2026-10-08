import type { ApiContext, ApiHooks } from './middleware.js';
import { ApiFault } from './errors.js';
import type { taskService } from '../services/tasks.js';
import type { organizationService } from '../services/organization.js';
import type { SessionProof } from '../services/authorization.js';
export function taskHandlers(
  tasks: ReturnType<typeof taskService>,
  organization: ReturnType<typeof organizationService>,
  proof: (c: ApiContext) => SessionProof,
): NonNullable<ApiHooks['handlers']> {
  const tx = (c: ApiContext) => {
    if (!c.transaction) throw new ApiFault('SERVICE_NOT_READY');
    return c.transaction;
  };
  const request = (c: ApiContext) => c.request.res!.get('X-Request-Id')!;
  return {
    get_api_projects_id_groups: async c=>({status:200,body:await tasks.groups(tx(c),proof(c),c.params.id!)}),
    post_api_projects_id_groups: async c=>({status:201,body:await tasks.createGroup(tx(c),proof(c),c.params.id!,c.body,request(c))}),
    patch_api_groups_id: async c=>({status:200,body:await tasks.patchGroup(tx(c),proof(c),c.params.id!,c.body,request(c))}),
    post_api_projects_id_board_move: async (c) => ({
      status: 200,
      body: await tasks.move(tx(c), proof(c), c.params.id!, c.body, request(c)),
    }),
    get_api_tasks_id_comments: async (c) => ({
      status: 200,
      body: await tasks.comments(tx(c), proof(c), c.params.id!, c.query),
    }),
    post_api_tasks_id_comments: async (c) => ({
      status: 201,
      body: await tasks.createComment(tx(c), proof(c), c.params.id!, c.body, request(c)),
    }),
    get_api_tasks: async (c) => ({ status: 200, body: await tasks.list(tx(c), proof(c), c.query) }),
    get_api_trash: async (c) => ({
      status: 200,
      body: await tasks.list(tx(c), proof(c), c.query, true),
    }),
    get_api_projects_id_board: async (c) => ({
      status: 200,
      body: await tasks.board(tx(c), proof(c), c.params.id!),
    }),
    delete_api_tasks_id: async (c) => ({
      status: 200,
      body: await tasks.trashMutation(tx(c), proof(c), c.params.id!, c.body, false, request(c)),
    }),
    post_api_tasks_id_restore: async (c) => ({
      status: 200,
      body: await tasks.trashMutation(tx(c), proof(c), c.params.id!, c.body, true, request(c)),
    }),
    get_api_organization: async (c) => ({
      status: 200,
      body: await organization.get(tx(c), proof(c)),
    }),
    patch_api_organization: async (c) => ({
      status: 200,
      body: await organization.patch(tx(c), proof(c), c.body, request(c)),
    }),
    post_api_tasks: async (c) => ({
      status: 201,
      body: await tasks.create(tx(c), proof(c), c.body, request(c)),
    }),
    get_api_tasks_id: async (c) => ({
      status: 200,
      body: await tasks.get(tx(c), proof(c), c.params.id!),
    }),
    patch_api_tasks_id: async (c) => ({
      status: 200,
      body: await tasks.patch(tx(c), proof(c), c.params.id!, c.body, request(c)),
    }),
    post_api_tasks_id_subtasks: async (c) => ({
      status: 201,
      body: await tasks.createSubtask(tx(c), proof(c), c.params.id!, c.body, request(c)),
    }),
    patch_api_subtasks_id: async (c) => ({
      status: 200,
      body: await tasks.patchSubtask(tx(c), proof(c), c.params.id!, c.body, false, request(c)),
    }),
    delete_api_subtasks_id: async (c) => {
      const result = await tasks.patchSubtask(
        tx(c),
        proof(c),
        c.params.id!,
        c.body,
        true,
        request(c),
      );
      return { status: 200, body: { item: result.task } };
    },
  };
}
