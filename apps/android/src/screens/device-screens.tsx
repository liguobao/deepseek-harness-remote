import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { CirclePlus, Laptop, Link2, MessageSquareText, MoreVertical, Settings, Unplug } from 'lucide-react-native'
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

export function DevicesScreen({ onPair, onDevice, onSettings }: {
  onPair: () => void
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
            <Text style={styles.subtitle}>Trusted Harness hosts</Text>
          </View>
          <RefreshAction refreshing={refreshing} onPress={() => void refresh()} />
        </View>

        {refreshing && devices.length === 0
          ? <LoadingRows />
          : devices.length === 0
            ? <EmptyState
                icon={Laptop}
                title="No trusted hosts yet"
                body="Create a one-time pairing code on a computer running the DSH Remote plugin."
                action={<Button label="Pair a device" icon={Link2} onPress={onPair} />}
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

        {devices.length > 0 && <View style={styles.bottomAction}><Button label="Pair another device" icon={CirclePlus} variant="secondary" onPress={onPair} /></View>}
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
  const info = useAppStore(state => state.systemInfo)
  const workspace = useAppStore(state => state.workspace)
  const connect = useAppStore(state => state.connectDevice)
  const reconnect = useAppStore(state => state.reconnect)
  const forget = useAppStore(state => state.forgetDevice)
  const isSelected = selected?.deviceId === device.deviceId
  const isConnected = isSelected && connection.phase === 'connected'
  const isConnecting = isSelected && (connection.phase === 'connecting' || connection.phase === 'reconnecting')

  const forgetDevice = () => Alert.alert(
    `Forget ${device.name}?`,
    'This revokes the server pairing and removes trust from this phone. To reconnect later, pair the device again.',
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
            label={isConnected ? 'Encrypted relay' : undefined}
          />
        </View>

        {connection.error !== undefined && isSelected && (
          <View style={styles.connectionError}>
            <Text style={styles.connectionErrorTitle}>Connection interrupted</Text>
            <Text style={styles.connectionErrorBody}>{connection.error}</Text>
            <Button label="Try again" variant="secondary" onPress={() => void reconnect()} />
          </View>
        )}

        {!isConnected
          ? <View style={styles.connectArea}>
              <Text style={styles.connectCopy}>{device.online ? 'Connect to load the current workspace and sessions.' : 'The host appears offline. You can retry when the Remote plugin is running.'}</Text>
              <Button label="Connect securely" onPress={() => void connect(device)} loading={isConnecting} disabled={!device.online && !isConnecting} />
            </View>
          : <>
              <SectionTitle>Current workspace</SectionTitle>
              <View style={styles.group}>
                <KeyValue label="Project" value={workspace?.name ?? 'Workspace'} />
                <KeyValue label="Directory" value={workspace?.cwd ?? 'Unavailable'} mono />
              </View>

              <SectionTitle>Harness</SectionTitle>
              <View style={styles.group}>
                <KeyValue label="Status" value={info?.online ? 'Running' : 'Unavailable'} />
                <KeyValue label="Hostname" value={info?.hostname ?? device.name} />
                <KeyValue label="Harness" value={info?.harnessVersion ?? 'Unknown version'} />
                <KeyValue label="Remote plugin" value={info?.pluginVersion ?? 'Unknown version'} />
                <KeyValue label="Transport" value="End-to-end encrypted relay" />
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
  const createSession = useAppStore(state => state.createSession)

  const open = async (session: RemoteSession) => {
    if (await openSession(session)) onSession(session)
  }

  const create = async () => {
    const session = await createSession()
    if (session !== undefined && await openSession(session)) onSession(session)
  }

  return (
    <View style={styles.flex}>
      <TopBar title="Sessions" onBack={onBack} action={<IconButton label="New session" icon={CirclePlus} onPress={() => void create()} disabled={busy === 'create-session'} />} />
      <Screen>
        <View style={styles.pageHeading}>
          <View><Text style={styles.title}>Harness sessions</Text><Text style={styles.subtitle}>Continue where you left off</Text></View>
        </View>
        {sessions.length === 0
          ? <EmptyState
              icon={MessageSquareText}
              title="No sessions"
              body="Start a session in the current workspace, then send your first instruction from this phone."
              action={<Button label="New session" icon={CirclePlus} onPress={() => void create()} loading={busy === 'create-session'} />}
            />
          : <View>{sessions.map(session => (
              <ListRow
                key={session.id}
                title={session.title}
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
  bottomAction: { marginTop: spacing.xxl },
  deviceHero: { paddingVertical: spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deviceIcon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  deviceHeroCopy: { flex: 1 },
  deviceName: { ...type.title, color: colors.ink },
  devicePlatform: { ...type.small, color: colors.muted, marginTop: 2 },
  connectArea: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.lg },
  connectCopy: { ...type.body, color: colors.muted },
  connectionError: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.dangerSoft, gap: spacing.sm },
  connectionErrorTitle: { ...type.bodyStrong, color: colors.ink },
  connectionErrorBody: { ...type.small, color: colors.muted },
  group: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  primaryArea: { marginTop: spacing.xxl },
})
