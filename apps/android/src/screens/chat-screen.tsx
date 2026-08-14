import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Bot, Check, CircleStop, Code2, Send, ShieldAlert, User, X } from 'lucide-react-native'
import type { PermissionDecision } from '@dsh-remote/protocol'
import { useAppStore } from '../state/store'
import type { ChatItem, ChatMessage, PermissionActivity, ToolActivity } from '../types'
import { Button, IconButton, TopBar } from '../ui/components'
import { colors, radius, spacing, type } from '../ui/theme'

export function ChatScreen({ onBack }: { onBack: () => void }) {
  const session = useAppStore(state => state.selectedSession)
  const messages = useAppStore(state => session === undefined ? [] : state.messages[session.id] ?? [])
  const busy = useAppStore(state => state.busyAction)
  const connection = useAppStore(state => state.connection)
  const capabilities = useAppStore(state => state.systemInfo?.capabilities ?? [])
  const sendMessage = useAppStore(state => state.sendMessage)
  const stopSession = useAppStore(state => state.stopSession)
  const respond = useAppStore(state => state.respondPermission)
  const [draft, setDraft] = useState('')
  const listRef = useRef<FlatList<ChatItem>>(null)
  const lastItem = messages.at(-1)
  const lastText = lastItem?.kind === 'message' ? lastItem.text : undefined

  useEffect(() => {
    if (messages.length > 0) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
  }, [messages.length, lastText])

  if (session === undefined) return null

  const submit = async () => {
    const text = draft.trim()
    if (text.length === 0) return
    setDraft('')
    if (!await sendMessage(text)) setDraft(text)
  }

  const connected = connection.phase === 'connected'
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <TopBar
        title={session.title}
        onBack={onBack}
        action={busy === 'send-message' || session.running
          ? <IconButton label="Stop generation" icon={CircleStop} onPress={() => void stopSession()} disabled={busy === 'stop-session'} />
          : undefined}
      />

      {connection.phase !== 'connected' && (
        <View style={styles.connectionBanner} accessibilityRole="alert">
          <View style={styles.connectionDot} />
          <Text style={styles.connectionBannerText}>{connection.phase === 'reconnecting' ? 'Reconnecting to host…' : 'Host connection is offline. Messages cannot be sent.'}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[styles.listContent, messages.length === 0 && styles.emptyList]}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChatItemView item={item} busyAction={busy} allowSession={capabilities.includes('permission.allow-session')} onRespond={respond} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={<WelcomeMessage />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message to DeepSeek Harness"
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask DSH…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={12_000}
            editable={connected}
            selectionColor={colors.accent}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !connected || draft.trim().length === 0 }}
            disabled={!connected || draft.trim().length === 0}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.sendButton, pressed && styles.sendPressed, (!connected || draft.trim().length === 0) && styles.sendDisabled]}
          >
            <Send size={19} color={colors.white} />
          </Pressable>
        </View>
        <Text style={styles.composerHint}>Actions still follow the host’s Harness permission policy.</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

function ChatItemView({ item, busyAction, allowSession, onRespond }: {
  item: ChatItem
  busyAction?: string
  allowSession: boolean
  onRespond: (requestId: string, decision: PermissionDecision) => Promise<void>
}) {
  if (item.kind === 'permission') return <PermissionCard item={item} busy={busyAction === `permission:${item.request.requestId}`} allowSession={allowSession} onRespond={onRespond} />
  if (item.kind === 'tool') return <ToolRow item={item} />
  return <MessageBubble item={item} />
}

function MessageBubble({ item }: { item: ChatMessage }) {
  const user = item.role === 'user'
  return (
    <View style={[styles.messageRow, user && styles.messageRowUser]}>
      <View style={[styles.avatar, user ? styles.avatarUser : styles.avatarAssistant]}>
        {user ? <User size={16} color={colors.white} /> : <Bot size={17} color={colors.primary} />}
      </View>
      <View style={[styles.messageBody, user && styles.messageBodyUser]}>
        <Text style={styles.messageLabel}>{user ? 'You' : item.role === 'system' ? 'System' : 'DSH'}</Text>
        <FormattedText text={item.text} />
        {item.streaming && <View style={styles.streamingCursor} accessibilityLabel="Response streaming" />}
      </View>
    </View>
  )
}

function FormattedText({ text }: { text: string }) {
  const chunks = text.split(/```/)
  return <View>{chunks.map((chunk, index) => index % 2 === 1
    ? <View key={index} style={styles.codeBlock}><Text selectable style={styles.codeText}>{chunk.replace(/^\w+\n/, '')}</Text></View>
    : chunk.length > 0 && <Text key={index} selectable style={styles.messageText}>{chunk}</Text>)}</View>
}

function ToolRow({ item }: { item: ToolActivity }) {
  const stateText = item.state === 'running' ? 'Running' : item.state === 'failed' ? 'Failed' : 'Finished'
  return (
    <View style={styles.toolRow}>
      <View style={styles.toolIcon}><Code2 size={17} color={colors.primary} /></View>
      <View style={styles.toolCopy}>
        <Text style={styles.toolName}>{item.toolName}</Text>
        {item.summary !== undefined && <Text style={styles.toolSummary} numberOfLines={3}>{item.summary}</Text>}
      </View>
      <Text style={[styles.toolState, item.state === 'failed' && styles.toolFailed]}>{stateText}</Text>
    </View>
  )
}

function PermissionCard({ item, busy, allowSession, onRespond }: {
  item: PermissionActivity
  busy: boolean
  allowSession: boolean
  onRespond: (requestId: string, decision: PermissionDecision) => Promise<void>
}) {
  const permission = item.request.permission
  const detail = permission.command ?? permission.toolName ?? permission.description ?? 'Harness requested an action.'
  if (item.decision !== undefined) {
    return (
      <View style={styles.permissionResolved}>
        {item.decision === 'deny' ? <X size={18} color={colors.danger} /> : <Check size={18} color={colors.success} />}
        <Text style={styles.permissionResolvedText}>{decisionLabel(item.decision)}</Text>
      </View>
    )
  }
  return (
    <View style={styles.permissionCard} accessibilityRole="alert">
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIcon}><ShieldAlert size={20} color={colors.warning} /></View>
        <View style={styles.permissionHeaderCopy}>
          <Text style={styles.permissionTitle}>Permission required</Text>
          <Text style={styles.permissionKind}>{permission.kind === 'command' ? 'Run command on host' : 'Harness action on host'}</Text>
        </View>
      </View>
      <View style={styles.permissionDetail}>
        <Text selectable style={permission.command !== undefined ? styles.permissionCode : styles.permissionText}>{detail}</Text>
        {permission.cwd !== undefined && <Text selectable style={styles.permissionCwd}>{permission.cwd}</Text>}
      </View>
      <Text style={styles.permissionScope}>“Allow for session” applies only to this Harness session and never bypasses host policy.</Text>
      <View style={styles.permissionActions}>
        <Button label="Allow once" onPress={() => void onRespond(item.request.requestId, 'allow_once')} loading={busy} />
        {allowSession && <Button label="Allow for session" variant="secondary" onPress={() => void onRespond(item.request.requestId, 'allow_session')} disabled={busy} />}
        <Button label="Deny" variant="quiet" onPress={() => void onRespond(item.request.requestId, 'deny')} disabled={busy} />
      </View>
    </View>
  )
}

function WelcomeMessage() {
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeIcon}><Bot size={25} color={colors.primary} /></View>
      <Text style={styles.welcomeTitle}>Continue this session</Text>
      <Text style={styles.welcomeBody}>Ask DSH to inspect, explain, or change something in the current workspace. Tool use and permission requests will appear here.</Text>
    </View>
  )
}

function decisionLabel(decision: PermissionDecision): string {
  if (decision === 'deny') return 'Permission denied'
  if (decision === 'allow_session') return 'Allowed for this session'
  return 'Allowed once'
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  connectionBanner: { minHeight: 40, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, backgroundColor: colors.warningSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  connectionDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.warning },
  connectionBannerText: { ...type.small, color: colors.ink, flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  messageRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarUser: { backgroundColor: colors.primary },
  avatarAssistant: { backgroundColor: colors.primarySoft },
  messageBody: { flex: 1, maxWidth: '88%' },
  messageBodyUser: { alignItems: 'flex-end' },
  messageLabel: { ...type.caption, color: colors.muted, marginBottom: 4 },
  messageText: { ...type.body, color: colors.ink },
  streamingCursor: { width: 7, height: 16, backgroundColor: colors.accent, borderRadius: 2, marginTop: 3 },
  codeBlock: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginVertical: spacing.xs },
  codeText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20, color: colors.ink },
  toolRow: { minHeight: 60, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toolIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  toolCopy: { flex: 1 },
  toolName: { ...type.smallStrong, color: colors.ink },
  toolSummary: { ...type.caption, color: colors.muted, fontFamily: 'monospace', marginTop: 2 },
  toolState: { ...type.caption, color: colors.success },
  toolFailed: { color: colors.danger },
  permissionCard: { borderRadius: radius.lg, backgroundColor: colors.warningSoft, padding: spacing.md, gap: spacing.md },
  permissionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  permissionIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  permissionHeaderCopy: { flex: 1 },
  permissionTitle: { ...type.bodyStrong, color: colors.ink },
  permissionKind: { ...type.small, color: colors.muted },
  permissionDetail: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm },
  permissionCode: { fontFamily: 'monospace', fontSize: 14, lineHeight: 21, color: colors.ink },
  permissionText: { ...type.body, color: colors.ink },
  permissionCwd: { ...type.caption, color: colors.muted, fontFamily: 'monospace', marginTop: spacing.xs },
  permissionScope: { ...type.caption, color: colors.muted },
  permissionActions: { gap: spacing.xs },
  permissionResolved: { borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.sm, flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  permissionResolvedText: { ...type.smallStrong, color: colors.ink },
  welcome: { alignItems: 'center', paddingHorizontal: spacing.xl },
  welcomeIcon: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  welcomeTitle: { ...type.heading, color: colors.ink },
  welcomeBody: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 340 },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator, backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  composer: { minHeight: 52, maxHeight: 144, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: spacing.sm, paddingRight: 5, paddingVertical: 5 },
  composerInput: { ...type.body, color: colors.ink, flex: 1, minHeight: 40, maxHeight: 126, paddingVertical: 8 },
  sendButton: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendPressed: { backgroundColor: colors.primaryPressed },
  sendDisabled: { backgroundColor: colors.disabled },
  composerHint: { ...type.caption, color: colors.muted, textAlign: 'center', marginTop: 5 },
})
