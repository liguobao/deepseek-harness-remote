import { basename } from 'node:path'
import type { Session } from '@deepseek-ai/dsh-session'
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'

export interface RemoteWorkspaceInfo {
  id: string | null
  name: string
  cwd: string
}

export class WorkspaceAdapter {
  constructor(private readonly registry?: WorkspaceRegistry) {}

  get(session?: Session): RemoteWorkspaceInfo | null {
    const cwd = session?.header.cwd
    if (cwd !== undefined) {
      const workspace = this.registry?.list().find(candidate => candidate.path === cwd)
      return workspace === undefined
        ? { id: null, name: basename(cwd) || cwd, cwd }
        : { id: String(workspace.id), name: workspace.title, cwd: workspace.path }
    }
    const workspace = this.registry?.list()[0]
    return workspace === undefined
      ? null
      : { id: String(workspace.id), name: workspace.title, cwd: workspace.path }
  }
}
