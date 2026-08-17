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

export function DevicesScreen({ onDevice, onSettings }: {
  onDevice: (device: RemoteDevice) => void
  onSettings: () => void
}) {
  const devices = useAppStore(state => state.devices)
  const refreshing = useAppStore(state => state.refreshing)
  const refresh = useAppStore(state => state.refreshDevices)

  return (
    <View style={styles.flex}>
      <TopBar title="设备" action={<IconButton label="设置" icon={Settings} onPress={onSettings} />} />
      <Screen>
        <View style={styles.pageHeading}>
          <View>
            <Text style={styles.title}>我的设备</Text>
            <Text style={styles.subtitle}>选择一台设备开始或继续对话</Text>
          </View>
          <RefreshAction refreshing={refreshing} onPress={() => void refresh()} />
        </View>

        {refreshing && devices.length === 0
          ? <LoadingRows />
          : devices.length === 0
            ? <EmptyState
                icon={Laptop}
                title="还没有可用设备"
                body="在电脑上安装 DSH Remote 插件，并登录同一账号，设备就会出现在这里。"
              />
            : <View>{devices.map(device => (
                <ListRow
                  key={device.deviceId}
                  title={device.name}
                  subtitle={platformName(device.platform)}
                  meta={device.online ? '可以连接' : lastSeenText(device.lastSeenAt)}
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
    `忘记 ${device.name}？`,
    '这会移除此手机保存的可信身份。以后重新连接时，需要再次确认设备。',
    [
      { text: '取消', style: 'cancel' },
      {
        text: '忘记设备',
        style: 'destructive',
        onPress: () => void forget(device.deviceId).then(forgotten => { if (forgotten) onForgotten() }),
      },
    ],
  )

  return (
    <View style={styles.flex}>
      <TopBar title="设备" onBack={onBack} action={<IconButton label="设备选项" icon={MoreVertical} onPress={forgetDevice} />} />
      <Screen>
        <View style={styles.deviceHero}>
          <View style={styles.deviceIcon}><Laptop size={28} color={colors.primary} /></View>
          <View style={styles.deviceHeroCopy}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.devicePlatform}>{platformName(device.platform)}</Text>
          </View>
          <StatusBadge
            status={isConnected ? 'relay' : device.online ? 'online' : 'offline'}
            label={isConnected ? '已加密' : undefined}
          />
        </View>

        {connection.error !== undefined && isSelected && (
          <View style={styles.connectionError}>
            <Text style={styles.connectionErrorTitle}>连接已中断</Text>
            <Text style={styles.connectionErrorBody}>{connection.error}</Text>
            <Button label="重试" variant="secondary" onPress={() => void reconnect()} />
          </View>
        )}

        {!device.trusted
          ? <View style={styles.connectArea}>
              <View style={styles.trustHeader}>
                <View style={styles.trustIcon}><ShieldCheck size={22} color={colors.primary} /></View>
                <View style={styles.trustCopy}>
                  <Text style={styles.connectCopy}>确认后会在此手机上固定设备加密密钥，后续任何密钥变更都会被阻止。</Text>
                  {device.fingerprint !== undefined && <Text selectable style={styles.fingerprint}>{device.fingerprint}</Text>}
                </View>
              </View>
              <Button label="信任此设备" onPress={() => void trust(device)} />
            </View>
          : !isConnected
            ? <View style={styles.connectArea}>
                <Text style={styles.connectCopy}>{device.online ? '安全连接后即可查看并继续设备上的对话。' : '设备当前离线，请确认电脑上的 Remote 插件正在运行。'}</Text>
                <Button label="安全连接" onPress={() => void connect(device)} loading={isConnecting} disabled={!device.online && !isConnecting} />
              </View>
            : <>
                <SectionTitle>设备信息</SectionTitle>
                <View style={styles.group}>
                  <KeyValue label="Harness" value={descriptor?.version ?? 'Unknown version'} />
                  <KeyValue label="目录" value={descriptor?.cwd ?? '不可用'} mono />
                  {descriptor?.provider !== undefined && <KeyValue label="Provider" value={descriptor.provider} />}
                  {descriptor?.model !== undefined && <KeyValue label="模型" value={descriptor.model} />}
                  <View style={styles.contentCounts}>
                    <View style={styles.contentCount}><Text style={styles.contentCountValue}>{workspaces.length}</Text><Text style={styles.contentCountLabel}>工作区</Text></View>
                    <View style={styles.contentCountDivider} />
                    <View style={styles.contentCount}><Text style={styles.contentCountValue}>{descriptor?.attachedSessions ?? 0}</Text><Text style={styles.contentCountLabel}>对话</Text></View>
                  </View>
                </View>

                <SectionTitle>安全连接</SectionTitle>
                <View style={styles.group}>
                  <KeyValue label="链路" value={connectionPath(connection.stats.mode)} />
                  <KeyValue label="加密" value="Noise IK · ChaCha20-Poly1305" />
                </View>

                <View style={styles.primaryArea}><Button label="查看工作区与对话" icon={MessageSquareText} onPress={onWorkspaces} /></View>
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
        title="对话"
        onBack={onBack}
        action={<IconButton label="新建对话" icon={CirclePlus} onPress={() => void createSession()} disabled={creating} />}
      />
      <Screen>
        <View style={styles.pageHeading}>
          <View><Text style={styles.title}>设备上的对话</Text><Text style={styles.subtitle}>继续上次未完成的工作</Text></View>
        </View>
        {creating && <Text style={styles.creatingText}>正在创建对话…</Text>}
        {active.length === 0 && archived.length === 0
          ? <EmptyState
              icon={MessageSquareText}
              title="还没有对话"
              body="新建一个对话，或先在电脑上的 Harness 中开始工作。"
              action={<Button label="新建对话" icon={CirclePlus} onPress={() => void createSession()} loading={creating} />}
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
                    <Text style={styles.archivedTitle}>已归档（{archived.length}）</Text>
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
    ? '继续对话'
    : undefined
  return lastPrompt ?? (session.parentSessionId === undefined ? '新对话' : '子代理对话')
}

function platformName(platform: string): string {
  const names: Record<string, string> = { darwin: 'macOS', win32: 'Windows', linux: 'Linux', android: 'Android' }
  return names[platform] ?? platform
}

function updatedText(timestamp?: number): string {
  if (timestamp === undefined) return '更新时间不可用'
  const delta = Math.max(0, Date.now() - timestamp)
  if (delta < 60_000) return '刚刚更新'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前更新`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前更新`
  return `${new Date(timestamp).toLocaleDateString('zh-CN')} 更新`
}

function lastSeenText(value?: number): string {
  if (value === undefined) return '最近在线时间不可用'
  return Number.isFinite(value) ? updatedText(value) : '最近在线时间不可用'
}

function connectionPath(mode: string | undefined): string {
  const names: Record<string, string> = {
    Relay: 'Relay (server)',
    WebRTC: 'WebRTC P2P',
    LAN: 'Local network',
    TURN: 'TURN relay',
    Disconnected: 'Disconnected',
  }
  return mode === undefined ? 'Unavailable' : names[mode] ?? mode
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
