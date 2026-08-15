import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { CirclePlus, Laptop, MessageSquareText, MoreVertical, Settings, ShieldCheck, Unplug } from 'lucide-react-native'
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

export function DevicesScreen({ onDevice, onSettings }: {
  onDevice: (device: RemoteDevice) => void
  onSettings: () => void
}) {
  const devices = useAppStore(state => state.devices)
  const refreshing = useAppStore(state => state.refreshing)
  const refresh = useAppStore(state => state.refreshDevices)

  return (
    <View style={styles.flex}>
      <TopBar title="DSH Remote" action={<IconButton label="Settings" icon={Settings} onPress={onSettings} />} />
      <Screen>
        <View style={styles.pageHeading}>
          <View>
            <Text style={styles.title}>My devices</Text>
            <Text style={styles.subtitle}>Harness hosts in your account</Text>
          </View>
          <RefreshAction refreshing={refreshing} onPress={() => void refresh()} />
        </View>

        {refreshing && devices.length === 0
          ? <LoadingRows />
          : devices.length === 0
            ? <EmptyState
                icon={Laptop}
                title="No hosts in this account"
                body="Install the DSH Remote plugin on a computer and sign it into the same Server account. The host will appear here."
              />
            : <View>{devices.map(device => (
                <ListRow
                  key={device.deviceId}
                  title={device.name}
                  subtitle={platformName(device.platform)}
                  meta={device.online ? 'Ready to connect' : lastSeenText(device.lastSeenAt)}
                  icon={Laptop}
                  status={<StatusBadge status={device.online ? 'online' : 'offline'} />}
                  onPress={() => onDevice(device)}
                />
              ))}</View>}
      </Screen>
    </View>
  )
}

export function DeviceDetailScreen({ device, onBack, onSessions, onForgotten }: {
  device: RemoteDevice
  onBack: () => void
  onSessions: () => void
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
    `Forget ${device.name}?`,
    'This removes the trusted identity from this phone. To reconnect later, trust the host again.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: () => void forget(device.deviceId).then(forgotten => { if (forgotten) onForgotten() }),
      },
    ],
  )

  return (
    <View style={styles.flex}>
      <TopBar title="Device" onBack={onBack} action={<IconButton label="Device options" icon={MoreVertical} onPress={forgetDevice} />} />
      <Screen>
        <View style={styles.deviceHero}>
          <View style={styles.deviceIcon}><Laptop size={28} color={colors.primary} /></View>
          <View style={styles.deviceHeroCopy}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.devicePlatform}>{platformName(device.platform)}</Text>
          </View>
          <StatusBadge
            status={isConnected ? 'relay' : device.online ? 'online' : 'offline'}
            label={isConnected ? 'Encrypted' : undefined}
          />
        </View>

        {connection.error !== undefined && isSelected && (
          <View style={styles.connectionError}>
            <Text style={styles.connectionErrorTitle}>Connection interrupted</Text>
            <Text style={styles.connectionErrorBody}>{connection.error}</Text>
            <Button label="Try again" variant="secondary" onPress={() => void reconnect()} />
          </View>
        )}

        {!device.trusted
          ? <View style={styles.connectArea}>
              <View style={styles.trustHeader}>
                <View style={styles.trustIcon}><ShieldCheck size={22} color={colors.primary} /></View>
                <View style={styles.trustCopy}>
                  <Text style={styles.connectCopy}>Trust this host to pin its encryption key on this phone. The key cannot be replaced silently later.</Text>
                  {device.fingerprint !== undefined && <Text selectable style={styles.fingerprint}>{device.fingerprint}</Text>}
                </View>
              </View>
              <Button label="Trust this host" onPress={() => void trust(device)} />
            </View>
          : !isConnected
            ? <View style={styles.connectArea}>
                <Text style={styles.connectCopy}>{device.online ? 'Connect to load the host workspace and sessions.' : 'The host appears offline. You can retry when the Remote plugin is running.'}</Text>
                <Button label="Connect securely" onPress={() => void connect(device)} loading={isConnecting} disabled={!device.online && !isConnecting} />
              </View>
            : <>
                <SectionTitle>Host</SectionTitle>
                <View style={styles.group}>
                  <KeyValue label="Harness" value={descriptor?.version ?? 'Unknown version'} />
                  <KeyValue label="Directory" value={descriptor?.cwd ?? 'Unavailable'} mono />
                  <KeyValue label="Workspaces" value={String(workspaces.length)} />
                  <KeyValue label="Attached sessions" value={String(descriptor?.attachedSessions ?? 0)} />
                </View>

                <View style={styles.primaryArea}><Button label="Open sessions" icon={MessageSquareText} onPress={onSessions} /></View>
              </>}
      </Screen>
    </View>
  )
}

export function SessionsScreen({ onBack, onSession }: { onBack: () => void; onSession: (session: RemoteSession) => void }) {
  const sessions = useAppStore(state => state.sessions)
  const busy = useAppStore(state => state.busyAction)
  const openSession = useAppStore(state => state.openSession)

  const open = async (session: RemoteSession) => {
    if (await openSession(session)) onSession(session)
  }

  return (
    <View style={styles.flex}>
      <TopBar title="Sessions" onBack={onBack} />
      <Screen>
        <View style={styles.pageHeading}>
          <View><Text style={styles.title}>Harness sessions</Text><Text style={styles.subtitle}>Continue where you left off</Text></View>
        </View>
        {sessions.length === 0
          ? <EmptyState
              icon={MessageSquareText}
              title="No sessions"
              body="Start a session on the host, then open it from this phone."
            />
          : <View>{sessions.map(session => (
              <ListRow
                key={session.sessionId}
                title={sessionTitle(session)}
                subtitle={session.cwd}
                meta={updatedText(session.updatedAt)}
                icon={MessageSquareText}
                status={session.running ? <StatusBadge status="running" /> : undefined}
                onPress={() => void open(session)}
              />
            ))}</View>}
      </Screen>
    </View>
  )
}

function sessionTitle(session: RemoteSession): string {
  const projections = (session as { projections?: { values?: Record<string, { title?: string }> } }).projections
  const title = projections?.values?.sessionListMetadata
  const lastPrompt = typeof (title as { lastPromptAt?: number | null } | undefined)?.lastPromptAt === 'number'
    ? 'Continue'
    : undefined
  return lastPrompt ?? (session.parentSessionId === undefined ? 'Session' : 'Subagent')
}

function platformName(platform: string): string {
  const names: Record<string, string> = { darwin: 'macOS', win32: 'Windows', linux: 'Linux', android: 'Android' }
  return names[platform] ?? platform
}

function updatedText(timestamp?: number): string {
  if (timestamp === undefined) return 'Update time unavailable'
  const delta = Math.max(0, Date.now() - timestamp)
  if (delta < 60_000) return 'Updated just now'
  if (delta < 3_600_000) return `Updated ${Math.floor(delta / 60_000)} min ago`
  if (delta < 86_400_000) return `Updated ${Math.floor(delta / 3_600_000)} hr ago`
  return `Updated ${new Date(timestamp).toLocaleDateString()}`
}

function lastSeenText(value?: number): string {
  if (value === undefined) return 'Last seen unavailable'
  return Number.isFinite(value) ? updatedText(value).replace('Updated', 'Last seen') : 'Last seen unavailable'
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
})
