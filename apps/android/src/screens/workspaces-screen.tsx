import { useEffect, useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ChevronRight, CirclePlus, Eye, EyeOff, Folder, FolderOpen, MessageSquareText, MoreVertical, X } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import type { DirectoryListing, RemoteSession, WorkspaceView } from '../types'
import { Button, EmptyState, IconButton, Screen, TopBar } from '../ui/components'
import { colors, radius, spacing, type } from '../ui/theme'
import zhCN from '../locales/zh-CN'

export function WorkspacesScreen({ onBack, onSession }: { onBack: () => void; onSession: (session: RemoteSession) => void }) {
  const workspaces = useAppStore(state => state.workspaces)
  const sessions = useAppStore(state => state.sessions)
  const busy = useAppStore(state => state.busyAction)
  const workspaceCreate = useAppStore(state => state.workspaceCreate)
  const workspaceRename = useAppStore(state => state.workspaceRename)
  const workspaceDelete = useAppStore(state => state.workspaceDelete)
  const workspaceMove = useAppStore(state => state.workspaceMove)
  const createSession = useAppStore(state => state.createSession)
  const openSession = useAppStore(state => state.openSession)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<WorkspaceView | undefined>(undefined)

  const open = async (session: RemoteSession) => {
    if (await openSession(session)) onSession(session)
  }

  const createInWorkspace = async (workspaceId: string) => {
    if (!await createSession(workspaceId)) return
    const created = useAppStore.getState().selectedSession
    if (created !== undefined) onSession(created)
  }

  const confirmDelete = (workspace: WorkspaceView) => Alert.alert(
    zhCN.workspaces.deleteTitle(workspace.title),
    zhCN.workspaces.deleteBody,
    [
      { text: zhCN.common.cancel, style: 'cancel' },
      { text: zhCN.common.delete, style: 'destructive', onPress: () => void workspaceDelete(workspace.workspaceId) },
    ],
  )

  const showActions = (workspace: WorkspaceView) => {
    const index = workspaces.findIndex(item => item.workspaceId === workspace.workspaceId)
    const canMoveUp = index > 0
    const canMoveDown = index >= 0 && index < workspaces.length - 1
    Alert.alert(workspace.title, workspace.path, [
      { text: zhCN.workspaces.rename, onPress: () => setRenameTarget(workspace) },
      canMoveUp
        ? { text: zhCN.workspaces.moveUp, onPress: () => void workspaceMove(workspace.workspaceId, workspaces[index - 1]!.workspaceId) }
        : { text: zhCN.workspaces.moveUp, style: 'cancel' as const },
      canMoveDown
        ? { text: zhCN.workspaces.moveDown, onPress: () => void workspaceMove(workspace.workspaceId, index + 2 < workspaces.length ? workspaces[index + 2]!.workspaceId : undefined) }
        : { text: zhCN.workspaces.moveDown, style: 'cancel' as const },
      { text: zhCN.common.cancel, style: 'cancel' },
      { text: zhCN.common.delete, style: 'destructive', onPress: () => confirmDelete(workspace) },
    ])
  }

  return (
    <View style={styles.flex}>
      <TopBar
        title={zhCN.workspaces.title}
        onBack={onBack}
        action={<IconButton label={zhCN.workspaces.create} icon={CirclePlus} onPress={() => setCreateOpen(true)} />}
      />
      <Screen>
        <View style={styles.pageHeading}>
          <View>
            <Text style={styles.title}>{zhCN.workspaces.deviceTitle}</Text>
            <Text style={styles.subtitle}>{zhCN.workspaces.lead}</Text>
          </View>
        </View>
        {workspaces.length === 0
          ? <EmptyState
              icon={FolderOpen}
              title={zhCN.workspaces.emptyTitle}
              body={zhCN.workspaces.emptyBody}
              action={<Button label={zhCN.workspaces.create} icon={CirclePlus} onPress={() => setCreateOpen(true)} />}
            />
          : <View>{workspaces.map(workspace => {
              const workspaceSessions = workspace.sessionIds.flatMap(sessionId => {
                const session = sessions.find(item => item.sessionId === sessionId)
                return session === undefined ? [] : [session]
              })
              return (
                <View key={workspace.workspaceId} style={styles.workspaceGroup}>
                  <View style={styles.workspaceRow}>
                    <View style={styles.workspaceIcon}><Folder size={18} color={colors.primary} /></View>
                    <View style={styles.workspaceCopy}>
                      <Text style={styles.workspaceTitle} numberOfLines={1}>{workspace.title}</Text>
                      <Text style={styles.workspacePath} numberOfLines={1}>{workspace.path}</Text>
                    </View>
                    <IconButton label={zhCN.workspaces.newSessionIn(workspace.title)} icon={CirclePlus} onPress={() => void createInWorkspace(workspace.workspaceId)} />
                    <IconButton label={zhCN.workspaces.options} icon={MoreVertical} onPress={() => showActions(workspace)} />
                  </View>
                  {workspaceSessions.length === 0
                    ? <Pressable onPress={() => void createInWorkspace(workspace.workspaceId)} style={styles.noSessions}><Text style={styles.noSessionsText}>{zhCN.workspaces.noSessions}</Text></Pressable>
                    : workspaceSessions.map(session => (
                        <Pressable key={session.sessionId} accessibilityRole="button" onPress={() => void open(session)} style={({ pressed }) => [styles.sessionRow, pressed && styles.workspaceRowPressed]}>
                          <MessageSquareText size={17} color={colors.muted} />
                          <View style={styles.sessionCopy}>
                            <Text style={styles.sessionTitle} numberOfLines={1}>{session.blank ? zhCN.sessions.untitled : shortPath(session.cwd) ?? zhCN.workspaces.unnamedSession}</Text>
                            <Text style={styles.sessionMeta}>{session.running ? zhCN.status.running : relativeTime(session.updatedAt)}</Text>
                          </View>
                          <ChevronRight size={17} color={colors.subtle} />
                        </Pressable>
                      ))}
                </View>
              )
            })}</View>}
      </Screen>

      <CreateWorkspaceModal
        visible={createOpen}
        busy={busy === 'create-workspace'}
        onClose={() => setCreateOpen(false)}
        onCreate={async path => workspaceCreate(path)}
      />
      <RenameWorkspaceModal
        target={renameTarget}
        busy={renameTarget !== undefined && busy === `rename-workspace:${renameTarget.workspaceId}`}
        onClose={() => setRenameTarget(undefined)}
        onRename={async (workspaceId, title) => workspaceRename(workspaceId, title)}
      />
    </View>
  )
}

function shortPath(path?: string): string | undefined {
  if (path === undefined) return undefined
  return path.split(/[\\/]/).filter(Boolean).at(-1)
}

function relativeTime(timestamp: number): string {
  const delta = Math.max(0, Date.now() - timestamp)
  if (delta < 60_000) return zhCN.time.justNow
  if (delta < 3_600_000) return zhCN.time.minutesAgo(Math.floor(delta / 60_000))
  if (delta < 86_400_000) return zhCN.time.hoursAgo(Math.floor(delta / 3_600_000))
  return new Date(timestamp).toLocaleDateString(zhCN.time.locale)
}

function CreateWorkspaceModal({ visible, busy, onClose, onCreate }: {
  visible: boolean
  busy: boolean
  onClose: () => void
  onCreate: (path: string) => Promise<boolean>
}) {
  const [path, setPath] = useState('')
  const [browseOpen, setBrowseOpen] = useState(false)

  const create = async () => {
    const trimmed = path.trim()
    if (trimmed.length === 0) return
    if (await onCreate(trimmed)) {
      setPath('')
      onClose()
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{zhCN.workspaces.create}</Text>
              <IconButton label={zhCN.common.close} icon={X} onPress={onClose} />
            </View>
            <Text style={styles.fieldLabel}>{zhCN.workspaces.deviceDirectory}</Text>
            <View style={styles.pathRow}>
              <TextInput
                style={styles.pathInput}
                value={path}
                onChangeText={setPath}
                placeholder="/home/user/project"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Button label={zhCN.workspaces.browse} variant="secondary" onPress={() => setBrowseOpen(true)} disabled={busy} />
            </View>
            <Text style={styles.fieldHint}>{zhCN.workspaces.directoryHint}</Text>
            <Button label={zhCN.workspaces.create} onPress={() => void create()} loading={busy} disabled={path.trim().length === 0} />
          </Pressable>
        </Pressable>
      </Modal>
      <DirectoryBrowserModal
        visible={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onChoose={picked => { setPath(picked); setBrowseOpen(false) }}
      />
    </>
  )
}

function RenameWorkspaceModal({ target, busy, onClose, onRename }: {
  target?: WorkspaceView
  busy: boolean
  onClose: () => void
  onRename: (workspaceId: string, title: string) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (target !== undefined) setTitle(target.title)
  }, [target])

  const rename = async () => {
    const trimmed = title.trim()
    if (target === undefined || trimmed.length === 0) return
    if (await onRename(target.workspaceId, trimmed)) onClose()
  }

  return (
    <Modal visible={target !== undefined} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{zhCN.workspaces.renameTitle}</Text>
            <IconButton label={zhCN.common.close} icon={X} onPress={onClose} />
          </View>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={zhCN.workspaces.namePlaceholder}
            placeholderTextColor={colors.muted}
            autoFocus
            editable={!busy}
          />
          <Button label={zhCN.workspaces.saveName} onPress={() => void rename()} loading={busy} disabled={title.trim().length === 0} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function DirectoryBrowserModal({ visible, onClose, onChoose }: {
  visible: boolean
  onClose: () => void
  onChoose: (path: string) => void
}) {
  const listDirectory = useAppStore(state => state.hostListDirectory)
  const [listing, setListing] = useState<DirectoryListing | undefined>(undefined)
  const [showHidden, setShowHidden] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    void listDirectory(undefined).then(result => {
      if (cancelled) return
      if (result === undefined) { setLoading(false); return }
      setListing(result)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [visible, listDirectory])

  const open = async (path: string) => {
    setLoading(true)
    setError(undefined)
    const result = await listDirectory(path)
    if (result !== undefined) setListing(result)
    setLoading(false)
  }

  const entries = listing === undefined ? [] : listing.entries.filter(entry => showHidden || !entry.hidden)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.browserSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{zhCN.workspaces.chooseFolder}</Text>
            <IconButton label={zhCN.common.close} icon={X} onPress={onClose} />
          </View>
          <View style={styles.browserPath}>
            <Text style={styles.browserPathText} numberOfLines={1}>{listing?.path ?? zhCN.workspaces.loading}</Text>
          </View>
          <View style={styles.crumbRow}>
            {(listing?.crumbs ?? []).map((crumb, index, all) => (
              <Pressable key={`${crumb.path}-${index}`} onPress={() => void open(crumb.path)}>
                <Text style={styles.crumbText}>
                  {crumb.name}{index < all.length - 1 ? ' / ' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
          {error !== undefined && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.browserList}>
            {loading
              ? <Text style={styles.loadingText}>{zhCN.workspaces.loadingDirectory}</Text>
              : entries.length === 0
                ? <Text style={styles.emptyText}>{zhCN.workspaces.noFolders}</Text>
                : entries.map(entry => (
                    <Pressable
                      key={entry.path}
                      accessibilityRole="button"
                      onPress={() => void open(entry.path)}
                      style={styles.entryRow}
                    >
                      <Folder size={16} color={colors.primary} />
                      <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
                      <ChevronRight size={14} color={colors.muted} />
                    </Pressable>
                  ))}
          </View>
          <View style={styles.browserFooter}>
            <Button
              label={showHidden ? zhCN.workspaces.hideHidden : zhCN.workspaces.showHidden}
              icon={showHidden ? EyeOff : Eye}
              variant="quiet"
              onPress={() => setShowHidden(current => !current)}
            />
            <Button
              label={zhCN.workspaces.chooseThisFolder}
              disabled={listing === undefined || loading}
              onPress={() => { if (listing !== undefined) onChoose(listing.path) }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  pageHeading: { paddingTop: spacing.xxl, paddingBottom: spacing.md },
  title: { ...type.title, color: colors.ink },
  subtitle: { ...type.small, color: colors.muted, marginTop: 2 },
  workspaceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  workspaceRowPressed: { opacity: 0.7 },
  workspaceIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  workspaceCopy: { flex: 1, gap: 2 },
  workspaceTitle: { ...type.bodyStrong, color: colors.ink },
  workspacePath: { ...type.caption, color: colors.muted, fontFamily: 'monospace' },
  workspaceMeta: { ...type.caption, color: colors.muted },
  workspaceGroup: { marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.sm },
  sessionRow: { minHeight: 58, marginLeft: 50, paddingVertical: spacing.sm, paddingRight: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  sessionCopy: { flex: 1 },
  sessionTitle: { ...type.smallStrong, color: colors.ink },
  sessionMeta: { ...type.caption, color: colors.muted, marginTop: 2 },
  noSessions: { minHeight: 48, marginLeft: 50, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  noSessionsText: { ...type.small, color: colors.primary },
  primaryArea: { marginTop: spacing.xxl },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  browserSheet: { height: '75%', backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.heading, color: colors.ink },
  fieldLabel: { ...type.smallStrong, color: colors.ink },
  fieldHint: { ...type.caption, color: colors.muted },
  pathRow: { flexDirection: 'row', gap: spacing.sm },
  pathInput: { flex: 1, ...type.body, color: colors.ink, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  titleInput: { ...type.body, color: colors.ink, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  browserPath: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },
  browserPathText: { ...type.small, color: colors.ink, fontFamily: 'monospace' },
  crumbRow: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: spacing.xs },
  crumbText: { ...type.small, color: colors.primary },
  browserList: { flex: 1, marginTop: spacing.xs },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  entryName: { ...type.body, color: colors.ink, flex: 1 },
  loadingText: { ...type.small, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  emptyText: { ...type.small, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  errorText: { ...type.small, color: colors.danger },
  browserFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
})
