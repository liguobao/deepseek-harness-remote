import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Archive, ChevronDown, ChevronUp, CircleCheck, CirclePlus, Laptop, MessageSquareText, Settings, ShieldCheck } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import type { ConnectionStage, RemoteDevice, RemoteSession } from '../types'
import {
  Button,
  EmptyState,
  IconButton,
  KeyValue,
  ListRow,
  LoadingRows,
  RefreshAction,
  Screen,
  SectionTitle,
  StatusBadge,
  TopBar,
} from '../ui/components'
import { colors, radius, spacing, type } from '../ui/theme'
import { strings as zhCN } from '../locales/i18n'
import { resolveSessionDisplayTitle } from './session-title'

export function DevicesScreen({ onDevice, onMore }: {
  onDevice: (device: RemoteDevice) => void
  onMore: () => void
}) {
  const devices = useAppStore(state => state.devices)
  const refreshing = useAppStore(state => state.refreshing)
  const refresh = useAppStore(state => state.refreshDevices)

  return (
    <View style={styles.flex}>
      <TopBar title="DSH Remote" action={<IconButton label={zhCN.settings.more} icon={Settings} onPress={onMore} />} />
      <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
        <View style={styles.pageHeading}>
          <View>
            <Text style={styles.title}>{zhCN.devices.myDevices}</Text>
            <Text style={styles.subtitle}>{zhCN.devices.lead}</Text>
          </View>
          <RefreshAction refreshing={refreshing} onPress={() => void refresh()} />
        </View>

        {refreshing && devices.length === 0
          ? <LoadingRows />
          : devices.length === 0
            ? <EmptyState
                icon={Laptop}
                title={zhCN.devices.emptyTitle}
                body={zhCN.devices.emptyBody}
              />
            : <View>{devices.map(device => (
                <ListRow
                  key={device.deviceId}
                  title={device.name}
                  subtitle={platformName(device.platform)}
                  meta={lastSeenText(device.lastSeenAt)}
                  metaInline
                  icon={Laptop}
                  status={<StatusBadge status={device.online ? 'online' : 'offline'} />}
                  onPress={() => onDevice(device)}
                />
              ))}</View>}
      </Screen>
    </View>
  )
}

const connectionStages = ['authenticating', 'transport', 'secure', 'loading'] as const satisfies readonly ConnectionStage[]

export function ConnectionScreen({ device, onBack, onConnected }: {
  device: RemoteDevice
  onBack: () => void
  onConnected: () => void
}) {
  const selectedDevice = useAppStore(state => state.selectedDevice)
  const connection = useAppStore(state => state.connection)
  const connectionStage = useAppStore(state => state.connectionStage)
  const connect = useAppStore(state => state.connectDevice)
  const disconnect = useAppStore(state => state.disconnect)
  const clearError = useAppStore(state => state.clearError)
  const [attempt, setAttempt] = useState(0)
  const launchedAttempt = useRef(-1)
  const leaving = useRef(false)
  const onConnectedRef = useRef(onConnected)
  onConnectedRef.current = onConnected

  useEffect(() => {
    if (launchedAttempt.current === attempt) return
    launchedAttempt.current = attempt
    let active = true
    const current = useAppStore.getState()
    if (current.selectedDevice?.deviceId === device.deviceId && current.connection.phase === 'connected') {
      onConnectedRef.current()
      return
    }
    void connect(device).then(connected => {
      if (active && !leaving.current && connected) onConnectedRef.current()
    })
    return () => { active = false }
  }, [attempt, connect, device])

  const currentStage = connectionStage ?? 'authenticating'
  const currentIndex = currentStage === 'ready'
    ? connectionStages.length
    : Math.max(0, connectionStages.indexOf(currentStage))
  const progress = [18, 42, 70, 92, 100][currentIndex] ?? 18
  const failed = selectedDevice?.deviceId === device.deviceId
    && connection.phase === 'offline'
    && connection.error !== undefined

  const cancel = () => {
    leaving.current = true
    void disconnect()
    onBack()
  }

  const retry = () => {
    clearError()
    setAttempt(value => value + 1)
  }

  return (
    <View style={styles.flex}>
      <TopBar title={zhCN.devices.connectingTitle} onBack={cancel} />
      <Screen>
        <View style={styles.connectionHero}>
          <View style={styles.connectionDeviceIcon}><Laptop size={30} color={colors.primary} /></View>
          <View style={styles.connectionHeading}>
            <Text style={styles.connectionStatus}>{zhCN.devices.connecting}</Text>
            <Text style={styles.connectionDeviceName} numberOfLines={2}>{device.name}</Text>
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{zhCN.devices.connectionProgress}</Text>
          <Text style={styles.progressValue}>{progress}%</Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.connectionSteps}>
          {connectionStages.map((stage, index) => {
            const completed = index < currentIndex
            const active = index === currentIndex && !failed
            const stepFailed = index === currentIndex && failed
            const copy = zhCN.devices.connectionSteps[stage]
            return (
              <View key={stage} style={styles.connectionStep}>
                <View style={styles.stepMarker}>
                  <View style={[
                    styles.stepCircle,
                    completed && styles.stepCircleComplete,
                    active && styles.stepCircleActive,
                    stepFailed && styles.stepCircleFailed,
                  ]}>
                    {completed
                      ? <CircleCheck size={18} color={colors.white} />
                      : active
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <View style={[styles.stepDot, stepFailed && styles.stepDotFailed]} />}
                  </View>
                  {index < connectionStages.length - 1 && <View style={[styles.stepConnector, completed && styles.stepConnectorComplete]} />}
                </View>
                <View style={styles.stepCopy}>
                  <Text style={[styles.stepTitle, (active || completed) && styles.stepTitleCurrent]}>{copy.title}</Text>
                  <Text style={styles.stepBody}>{copy.body}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {failed && (
          <View style={styles.connectionError}>
            <Text style={styles.connectionErrorTitle}>{zhCN.devices.connectionInterrupted}</Text>
            <Text style={styles.connectionErrorBody}>{connection.error}</Text>
            <Button label={zhCN.devices.retryConnection} variant="secondary" onPress={retry} />
          </View>
        )}
      </Screen>
    </View>
  )
}

export function DeviceDetailScreen({ device, onBack, onConnect, onWorkspaces }: {
  device: RemoteDevice
  onBack: () => void
  onConnect: () => void
  onWorkspaces?: () => void
}) {
  const selected = useAppStore(state => state.selectedDevice)
  const connection = useAppStore(state => state.connection)
  const descriptor = useAppStore(state => state.hostDescriptor)
  const workspaces = useAppStore(state => state.workspaces)
  const trust = useAppStore(state => state.trustDevice)
  const reconnect = useAppStore(state => state.reconnect)
  const isSelected = selected?.deviceId === device.deviceId
  const isConnected = isSelected && connection.phase === 'connected'

  const trustAndContinue = async () => {
    if (await trust(device) && device.online) onConnect()
  }

  return (
    <View style={styles.flex}>
      <TopBar title={zhCN.devices.title} onBack={onBack} />
      <Screen>
        <View style={styles.deviceHero}>
          <View style={styles.deviceIcon}><Laptop size={28} color={colors.primary} /></View>
          <View style={styles.deviceHeroCopy}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.devicePlatform}>{platformName(device.platform)}</Text>
          </View>
          <StatusBadge
            status={connectionBadgeStatus(isSelected, connection.phase, connection.stats.mode, device.online)}
          />
        </View>

        {connection.error !== undefined && isSelected && (
          <View style={styles.connectionError}>
            <Text style={styles.connectionErrorTitle}>{zhCN.devices.connectionInterrupted}</Text>
            <Text style={styles.connectionErrorBody}>{connection.error}</Text>
            <Button label={zhCN.common.retry} variant="secondary" onPress={() => void reconnect()} />
          </View>
        )}

        {!device.trusted
          ? <View style={styles.connectArea}>
              <View style={styles.trustHeader}>
                <View style={styles.trustIcon}><ShieldCheck size={22} color={colors.primary} /></View>
                <View style={styles.trustCopy}>
                  <Text style={styles.connectCopy}>{zhCN.devices.trustExplanation}</Text>
                  {device.fingerprint !== undefined && <Text selectable style={styles.fingerprint}>{device.fingerprint}</Text>}
                </View>
              </View>
              <Button label={zhCN.devices.trust} onPress={() => void trustAndContinue()} />
            </View>
          : !isConnected
            ? <View style={styles.connectArea}>
                <Text style={styles.connectCopy}>{device.online ? zhCN.devices.connectReady : zhCN.devices.offlineHelp}</Text>
                <Button label={zhCN.devices.secureConnect} onPress={onConnect} disabled={!device.online} />
              </View>
            : <>
                <SectionTitle>{zhCN.devices.info}</SectionTitle>
                <View style={styles.group}>
                  <KeyValue label={zhCN.devices.harness} value={descriptor?.version ?? zhCN.devices.unknownVersion} />
                  <KeyValue label={zhCN.devices.directory} value={descriptor?.cwd ?? zhCN.common.unavailable} mono />
                  {descriptor?.provider !== undefined && <KeyValue label={zhCN.devices.provider} value={descriptor.provider} />}
                  {descriptor?.model !== undefined && <KeyValue label={zhCN.devices.model} value={descriptor.model} />}
                  <View style={styles.contentCounts}>
                    <View style={styles.contentCount}><Text style={styles.contentCountValue}>{workspaces.length}</Text><Text style={styles.contentCountLabel}>{zhCN.devices.workspaces}</Text></View>
                    <View style={styles.contentCountDivider} />
                    <View style={styles.contentCount}><Text style={styles.contentCountValue}>{descriptor?.attachedSessions ?? 0}</Text><Text style={styles.contentCountLabel}>{zhCN.devices.conversations}</Text></View>
                  </View>
                </View>

                <SectionTitle>{zhCN.devices.secureConnection}</SectionTitle>
                <View style={styles.group}>
                  <KeyValue label={zhCN.devices.path} value={connectionPath(connection.stats.mode)} />
                  <KeyValue label={zhCN.devices.encryption} value="Noise IK · ChaCha20-Poly1305" />
                </View>

                {onWorkspaces !== undefined && <View style={styles.primaryArea}><Button label={zhCN.devices.viewWorkspaces} icon={MessageSquareText} onPress={onWorkspaces} /></View>}
              </>}
      </Screen>
    </View>
  )
}

export function SessionsScreen({ onBack, onSession }: { onBack: () => void; onSession: (session: RemoteSession) => void }) {
  const sessions = useAppStore(state => state.sessions)
  const archivedSessionIds = useAppStore(state => state.archivedSessionIds)
  const busy = useAppStore(state => state.busyAction)
  const openSession = useAppStore(state => state.openSession)
  const createSession = useAppStore(state => state.createSession)
  const [showArchived, setShowArchived] = useState(false)

  const open = async (session: RemoteSession) => {
    if (await openSession(session)) onSession(session)
  }

  const archivedSet = new Set(archivedSessionIds)
  const active = sessions.filter(session => !archivedSet.has(session.sessionId))
  const archived = sessions.filter(session => archivedSet.has(session.sessionId))
  const creating = busy === 'create-session'

  return (
    <View style={styles.flex}>
      <TopBar
        title={zhCN.sessions.title}
        onBack={onBack}
        action={<IconButton label={zhCN.sessions.new} icon={CirclePlus} onPress={() => void createSession()} disabled={creating} />}
      />
      <Screen>
        <View style={styles.pageHeading}>
          <View><Text style={styles.title}>{zhCN.sessions.deviceTitle}</Text><Text style={styles.subtitle}>{zhCN.sessions.lead}</Text></View>
        </View>
        {creating && <Text style={styles.creatingText}>{zhCN.sessions.creating}</Text>}
        {active.length === 0 && archived.length === 0
          ? <EmptyState
              icon={MessageSquareText}
              title={zhCN.sessions.emptyTitle}
              body={zhCN.sessions.emptyBody}
              action={<Button label={zhCN.sessions.new} icon={CirclePlus} onPress={() => void createSession()} loading={creating} />}
            />
          : <View>
              {active.map(session => (
                <ListRow
                  key={session.sessionId}
                  title={sessionTitle(session)}
                  subtitle={session.cwd}
                  meta={updatedText(session.updatedAt)}
                  icon={MessageSquareText}
                  status={session.running ? <StatusBadge status="running" /> : undefined}
                  onPress={() => void open(session)}
                />
              ))}
              {archived.length > 0 && (
                <View style={styles.archivedSection}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showArchived }}
                    onPress={() => setShowArchived(current => !current)}
                    style={styles.archivedHeader}
                  >
                    <Archive size={16} color={colors.muted} />
                    <Text style={styles.archivedTitle}>{zhCN.sessions.archived(archived.length)}</Text>
                    {showArchived ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
                  </Pressable>
                  {showArchived && archived.map(session => (
                    <ListRow
                      key={session.sessionId}
                      title={sessionTitle(session)}
                      subtitle={session.cwd}
                      meta={updatedText(session.updatedAt)}
                      icon={Archive}
                      onPress={() => void open(session)}
                    />
                  ))}
                </View>
              )}
            </View>}
      </Screen>
    </View>
  )
}

function sessionTitle(session: RemoteSession): string {
  const resolvedTitle = resolveSessionDisplayTitle(session)
  if (resolvedTitle !== undefined) return resolvedTitle
  return session.parentSessionId === undefined ? zhCN.sessions.untitled : zhCN.sessions.child
}

function platformName(platform: string): string {
  const names: Record<string, string> = { darwin: 'macOS', win32: 'Windows', linux: 'Linux', android: 'Android' }
  return names[platform] ?? platform
}

function updatedText(timestamp?: number): string {
  if (timestamp === undefined) return zhCN.time.unavailable
  const delta = Math.max(0, Date.now() - timestamp)
  if (delta < 60_000) return zhCN.time.justNow
  if (delta < 3_600_000) return `${zhCN.time.minutesAgo(Math.floor(delta / 60_000))}${zhCN.time.updatedSuffix}`
  if (delta < 86_400_000) return `${zhCN.time.hoursAgo(Math.floor(delta / 3_600_000))}${zhCN.time.updatedSuffix}`
  return `${new Date(timestamp).toLocaleDateString(zhCN.time.locale)} ${zhCN.time.updatedSuffix}`
}

function lastSeenText(value?: number): string {
  if (value === undefined) return zhCN.time.lastSeenUnavailable
  if (!Number.isFinite(value)) return zhCN.time.lastSeenUnavailable
  const delta = Math.max(0, Date.now() - value)
  if (delta < 60_000) return zhCN.time.lastActive(zhCN.time.now)
  if (delta < 3_600_000) return zhCN.time.lastActive(zhCN.time.minutesAgo(Math.floor(delta / 60_000)))
  if (delta < 86_400_000) return zhCN.time.lastActive(zhCN.time.hoursAgo(Math.floor(delta / 3_600_000)))
  return zhCN.time.lastActive(new Date(value).toLocaleDateString(zhCN.time.locale))
}

function connectionPath(mode: string | undefined): string {
  const names: Record<string, string> = {
    Relay: zhCN.status.relay,
    WebRTC: zhCN.status.p2p,
    P2P: zhCN.status.p2p,
    LAN: zhCN.status.lan,
    TURN: zhCN.status.turn,
    Disconnected: zhCN.status.disconnected,
  }
  return mode === undefined ? zhCN.common.unavailable : names[mode] ?? mode
}

function connectionBadgeStatus(
  isSelected: boolean,
  phase: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'offline',
  mode: string | undefined,
  deviceOnline: boolean,
): 'online' | 'offline' | 'lan' | 'relay' | 'p2p' | 'turn' | 'waiting' {
  if (!isSelected) return deviceOnline ? 'online' : 'offline'
  if (phase === 'connecting' || phase === 'reconnecting') return 'waiting'
  if (phase !== 'connected') return 'offline'
  if (mode === 'LAN') return 'lan'
  if (mode === 'P2P' || mode === 'WebRTC') return 'p2p'
  if (mode === 'TURN') return 'turn'
  if (mode === 'Relay') return 'relay'
  return 'online'
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  pageHeading: { paddingTop: spacing.xxl, paddingBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.title, color: colors.ink },
  subtitle: { ...type.small, color: colors.muted, marginTop: 2 },
  connectionHero: { alignItems: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.xxl },
  connectionDeviceIcon: { width: 68, height: 68, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  connectionHeading: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.xxs },
  connectionStatus: { ...type.smallStrong, color: colors.muted, textAlign: 'center' },
  connectionDeviceName: { ...type.title, color: colors.ink, textAlign: 'center' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  progressLabel: { ...type.smallStrong, color: colors.ink },
  progressValue: { ...type.caption, color: colors.primary },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  connectionSteps: { marginTop: spacing.xxl },
  connectionStep: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  stepMarker: { width: 30, alignItems: 'center' },
  stepCircle: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: colors.primarySoft },
  stepCircleComplete: { backgroundColor: colors.primary },
  stepCircleFailed: { backgroundColor: colors.dangerSoft },
  stepDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.subtle },
  stepDotFailed: { backgroundColor: colors.danger },
  stepConnector: { width: 2, flex: 1, minHeight: spacing.xxl, marginVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.separator },
  stepConnectorComplete: { backgroundColor: colors.primary },
  stepCopy: { flex: 1, paddingBottom: spacing.xl },
  stepTitle: { ...type.bodyStrong, color: colors.muted },
  stepTitleCurrent: { color: colors.ink },
  stepBody: { ...type.small, color: colors.muted, marginTop: 2 },
  deviceHero: { paddingVertical: spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deviceIcon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  deviceHeroCopy: { flex: 1 },
  deviceName: { ...type.title, color: colors.ink },
  devicePlatform: { ...type.small, color: colors.muted, marginTop: 2 },
  connectArea: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.lg },
  connectCopy: { ...type.body, color: colors.muted },
  trustHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  trustIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  trustCopy: { flex: 1 },
  fingerprint: { ...type.caption, color: colors.primary, fontFamily: 'monospace', marginTop: spacing.xs },
  connectionError: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.dangerSoft, gap: spacing.sm },
  connectionErrorTitle: { ...type.bodyStrong, color: colors.ink },
  connectionErrorBody: { ...type.small, color: colors.muted },
  group: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  primaryArea: { marginTop: spacing.xxl },
  secondaryArea: { marginTop: spacing.sm },
  contentCounts: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  contentCount: { flex: 1, alignItems: 'center' },
  contentCountValue: { ...type.heading, color: colors.ink },
  contentCountLabel: { ...type.caption, color: colors.muted, marginTop: 2 },
  contentCountDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.separator },
  creatingText: { ...type.small, color: colors.muted, marginBottom: spacing.sm },
  archivedSection: { marginTop: spacing.lg },
  archivedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  archivedTitle: { ...type.smallStrong, color: colors.muted, flex: 1 },
  connectionDetails: { marginTop: spacing.lg },
})
