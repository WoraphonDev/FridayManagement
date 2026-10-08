import type { ApiContext, ApiHooks } from './middleware.js';
import { ApiFault } from './errors.js';
import { workspaceService } from '../services/workspaces.js';
import type { SessionProof } from '../services/authorization.js';
export function workspaceHandlers(
  service: ReturnType<typeof workspaceService>,
  proof: (c: ApiContext) => SessionProof,
): NonNullable<ApiHooks['handlers']> {
  const tx = (c: ApiContext) => {
    if (!c.transaction) throw new ApiFault('SERVICE_NOT_READY');
    return c.transaction;
  };
  const request = (c: ApiContext) => c.request.res!.get('X-Request-Id')!;
  return {
    get_api_directory: async (c) => ({
      status: 200,
      body: await service.directory(tx(c), proof(c), c.query),
    }),
    get_api_teams: async (c) => ({
      status: 200,
      body: await service.teams(tx(c), proof(c), c.query),
    }),
    post_api_teams: async (c) => ({
      status: 201,
      body: await service.createTeam(tx(c), proof(c), c.body, request(c)),
    }),
    patch_api_teams_id: async (c) => ({
      status: 200,
      body: await service.patchTeam(tx(c), proof(c), c.params.id!, c.body, request(c)),
    }),
    put_api_teams_id_members_userId: async (c) => ({
      status: 200,
      body: await service.teamMember(
        tx(c),
        proof(c),
        c.params.id!,
        c.params.userId!,
        c.body,
        false,
        request(c),
      ),
    }),
    delete_api_teams_id_members_userId: async (c) => ({
      status: 200,
      body: await service.teamMember(
        tx(c),
        proof(c),
        c.params.id!,
        c.params.userId!,
        c.body,
        true,
        request(c),
      ),
    }),
    get_api_projects: async (c) => ({
      status: 200,
      body: await service.projects(tx(c), proof(c), c.query),
    }),
    post_api_projects: async (c) => ({
      status: 201,
      body: await service.createProject(tx(c), proof(c), c.body, request(c)),
    }),
    patch_api_projects_id: async (c) => ({
      status: 200,
      body: await service.patchProject(tx(c), proof(c), c.params.id!, c.body, request(c)),
    }),
    get_api_projects_id_members: async (c) => ({
      status: 200,
      body: await service.members(tx(c), c.params.id!, proof(c)),
    }),
    put_api_projects_id_members_userId: async (c) => ({
      status: 200,
      body: await service.projectMember(
        tx(c),
        proof(c),
        c.params.id!,
        c.params.userId!,
        c.body,
        false,
        request(c),
      ),
    }),
    delete_api_projects_id_members_userId: async (c) => ({
      status: 200,
      body: await service.projectMember(
        tx(c),
        proof(c),
        c.params.id!,
        c.params.userId!,
        c.body,
        true,
        request(c),
      ),
    }),
  };
}
