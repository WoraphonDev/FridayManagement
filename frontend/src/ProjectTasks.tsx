import { ApiError, type Self } from './api';
import type { Project } from './workspace-api';
import { lazy, Suspense } from 'react';
import { Loading } from './shared/components';
const TaskWorkspace = lazy(() =>
  import('./TaskWorkspace').then((m) => ({ default: m.TaskWorkspace })),
);
export function ProjectTasks({
  project,
  self,
  online,
  onFailure,
  onClose,
  initialView,
}: {
  project: Project;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onClose: () => void;
  initialView?: 'overview';
}) {
  return (
    <section className="project-board" aria-label={`Project tasks · ${project.name}`}>
      <Suspense fallback={<Loading />}>
        <TaskWorkspace
          {...{ project, self, online, onFailure }}
          onScopeRemoved={onClose}
          onBack={onClose}
          initialView={initialView}
        />
      </Suspense>
    </section>
  );
}
