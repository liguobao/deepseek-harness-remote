import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Archive, ChevronDown, ChevronUp, CirclePlus, Laptop, MessageSquareText, MoreVertical, Settings, ShieldCheck, Unplug } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import type { RemoteDevice, RemoteSession } from '../types'
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
import zhCN from '../locales/zh-CN'

export function DevicesScreen({ onDevice, onSettings }: {
  onDevice: (device: RemoteDevice) => void
  onSettings: () => void
}) {
  const devices = useAppStore(state => state.devices)
  const refreshing = useAppStore(state => state.refreshing)
  const refresh = useAppStore(state => state.refreshDevices)

  return (
    <View style={styles.flex}>
      <TopBar title={zhCN.devices.title} action={<IconButton label={zhCN.settings.title} icon={Settings} onPress={onSettings} />} />
      <Screen>
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
                  meta={device.online ? zhCN.devices.canConnect : lastSeenText(device.lastSeenAt)}
                  icon={Laptop}
                  status={<StatusBadge status={device.online ? 'online' : 'offline'} />}
                  onPress={() => onDevice(device)}
                />
              ))}</View>}
      </Screen>
    </View>
  )
}

export function DeviceDetailScreen({ device, onBack, onWorkspaces, onForgotten }: {
  device: RemoteDevice
  onBack: () => void
  onWorkspaces: () => void
  onForgotten: () => void
}) {
  const selected = useAppStore(state => state.selectedDevice)
  const connection = useAppStore(state => state.connection)
  const descriptor = useAppStore(state => state.hostDescriptor)
  const workspaces = useAppStore(state => state.workspaces)
  const trust = useAppStore(state => state.trustDevice)
  const connect = useAppStore(state => state.connectDevice)
  const reconnect = useAppStore(state => state.reconnect)
  const forget = useAppStore(state => state.forgetDevice)
  const isSelected = selected?.deviceId === device.deviceId
  const isConnected = isSelected && connection.phase === 'connected'
  const isConnecting = isSelected && (connection.phase === 'connecting' || connection.phase === 'reconnecting')

  const forgetDevice = () => Alert.alert(
    zhCN.devices.forgetTitle(device.name),
    zhCN.devices.forgetBody,
    [
      { text: zhCN.common.cancel, style: 'cancel' },
      {
        text: zhCN.devices.forget,
        style: 'destructive',
        onPress: () => void forget(device.deviceId).then(forgotten => { if (forgotten) onForgotten() }),
      },
    ],
  )

  return (
    <View style={styles.flex}>
      <TopBar title={zhCN.devices.title} onBack={onBack} action={<IconButton label={zhCN.devices.options} icon={MoreVertical} onPress={forgetDevice} />} />
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
              <Button label={zhCN.devices.trust} onPress={() => void trust(device)} />
            </View>
          : !isConnected
            ? <View style={styles.connectArea}>
                <Text style={styles.connectCopy}>{device.online ? zhCN.devices.connectReady : zhCN.devices.offlineHelp}</Text>
                <Button label={zhCN.devices.secureConnect} onPress={() => void connect(device)} loading={isConnecting} disabled={!device.online && !isConnecting} />
              </View>
            : <>
                <SectionTitle>{zhCN.devices.info}</SectionTitle>
                <View style={styles.group}>
                  <KeyValue label="Harness" value={descriptor?.version ?? zhCN.devices.unknownVersion} />
                  <KeyValue label={zhCN.devices.directory} value={descriptor?.cwd ?? zhCN.common.unavailable} mono />
                  {descriptor?.provider !== undefined && <KeyValue label="Provider" value={descriptor.provider} />}
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

                <View style={styles.primaryArea}><Button label={zhCN.devices.viewWorkspaces} icon={MessageSquareText} onPress={onWorkspaces} /></View>
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
  const projections = (session as { projections?: { values?: Record<string, { title?: string }> } }).projections
  const title = projections?.values?.sessionListMetadata
  const lastPrompt = typeof (title as { lastPromptAt?: number | null } | undefined)?.lastPromptAt === 'number'
    ? zhCN.sessions.continue
    : undefined
  return lastPrompt ?? (session.parentSessionId === undefined ? zhCN.sessions.untitled : zhCN.sessions.child)
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
  return Number.isFinite(value) ? updatedText(value) : zhCN.time.lastSeenUnavailable
}

function connectionPath(mode: string | undefined): string {
  const names: Record<string, string> = {
    Relay: 'Relay · 服务器中继',
    WebRTC: 'P2P · WebRTC 直连',
    P2P: 'P2P · WebRTC 直连',
    LAN: 'LAN · 局域网直连',
    TURN: 'TURN · WebRTC 中继',
    Disconnected: '未连接',
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
