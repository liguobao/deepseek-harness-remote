import type { CodexPermissionPreset } from '@dsh-remote/protocol'

/** Only exact policy pairs can be represented by the Remote permission picker. */
export function codexPermissionPresetFromResponse(value: unknown): CodexPermissionPreset | undefined {
  const root = record(value)
  for (const settings of [root, record(root.threadSettings)]) {
    const sandbox = settings.sandbox ?? settings.sandboxPolicy
    const type = record(sandbox).type
    if (settings.approvalPolicy === 'never' && (sandbox === 'danger-full-access' || type === 'dangerFullAccess')) {
      return 'danger-full-access'
    }
    if (settings.approvalPolicy === 'on-request' && (sandbox === 'workspace-write' || type === 'workspaceWrite')) {
      return 'workspace-write'
    }
  }
  return undefined
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}
