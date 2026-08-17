import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Bot, Check, ChevronDown, CircleStop, Code2, Send, ShieldAlert, Sparkles, User, X } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import type { ApprovalActivity, ChatItem, ChatMessage, ModelCatalogModel, ModelProviderGroup, PermissionSelect, QuestionActivity, RemoteSession, ToolActivity } from '../types'
import { Button, IconButton, TopBar } from '../ui/components'
import { colors, radius, spacing, type } from '../ui/theme'

export function ChatScreen({ onBack }: { onBack: () => void }) {
  const session = useAppStore(state => state.selectedSession)
  const messages = useAppStore(state => session === undefined ? [] : state.messages[session.sessionId] ?? [])
  const busy = useAppStore(state => state.busyAction)
  const connection = useAppStore(state => state.connection)
  const historyHasMore = useAppStore(state => state.historyHasMore)
  const historyLoadingOlder = useAppStore(state => state.historyLoadingOlder)
  const sessionModels = useAppStore(state => state.sessionModels)
  const modelSelecting = useAppStore(state => state.modelSelecting)
  const permissionSelecting = useAppStore(state => state.permissionSelecting)
  const sendMessage = useAppStore(state => state.sendMessage)
  const stopSession = useAppStore(state => state.stopSession)
  const respondApproval = useAppStore(state => state.respondApproval)
  const respondQuestion = useAppStore(state => state.respondQuestion)
  const loadOlderHistory = useAppStore(state => state.loadOlderHistory)
  const selectModel = useAppStore(state => state.selectModel)
  const selectPermission = useAppStore(state => state.selectPermission)
  const [draft, setDraft] = useState('')
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [permissionPickerOpen, setPermissionPickerOpen] = useState(false)
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

  const pickModel = async (group: ModelProviderGroup, model: ModelCatalogModel) => {
    setModelPickerOpen(false)
    await selectModel({ provider: group.id, model: model.id })
  }

  const connected = connection.phase === 'connected'
  const permissions = sessionPermissions(session)
  const currentPermission = permissions?.options.find(option => option.value === permissions.currentValue)

  const pickPermission = (preset: string) => {
    setPermissionPickerOpen(false)
    const apply = () => void selectPermission(preset)
    if (preset === 'danger-full-access') {
      Alert.alert('确认启用 Full access？', '开启后，Harness 可以直接修改文件、运行命令和执行更多敏感操作。请仅在信任当前任务时开启。', [
        { text: '取消', style: 'cancel' },
        { text: '启用', style: 'destructive', onPress: apply },
      ])
    } else apply()
  }
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <TopBar
        title={sessionTitle(session.sessionId)}
        onBack={onBack}
        action={busy === 'send-message' || session.running
          ? <IconButton label="停止生成" icon={CircleStop} onPress={() => void stopSession()} disabled={busy === 'stop-session'} />
          : undefined}
      />

      <View style={styles.sessionControls}>
        {sessionModels !== undefined && (
          <Pressable accessibilityRole="button" accessibilityLabel="选择模型" onPress={() => setModelPickerOpen(true)} style={styles.modelChip}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.modelChipText} numberOfLines={1}>{sessionModels.current.model}</Text>
            {modelSelecting ? <ActivityIndicator size="small" color={colors.muted} /> : <ChevronDown size={14} color={colors.muted} />}
          </Pressable>
        )}
        {permissions !== undefined && (
          <Pressable accessibilityRole="button" accessibilityLabel={`审批模式：${currentPermission?.name ?? permissions.currentValue}`} onPress={() => setPermissionPickerOpen(true)} style={styles.permissionChip}>
            <ShieldAlert size={14} color={colors.primary} />
            <Text style={styles.modelChipText} numberOfLines={1}>{currentPermission?.name ?? permissions.currentValue}</Text>
            {permissionSelecting ? <ActivityIndicator size="small" color={colors.muted} /> : <ChevronDown size={14} color={colors.muted} />}
          </Pressable>
        )}
      </View>

      {connection.phase !== 'connected' && (
        <View style={styles.connectionBanner} accessibilityRole="alert">
          <View style={styles.connectionDot} />
          <Text style={styles.connectionBannerText}>{connection.phase === 'reconnecting' ? '正在重新连接设备…' : '设备连接已离线，暂时无法发送消息。'}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[styles.listContent, messages.length === 0 && styles.emptyList]}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChatItemView item={item} busyAction={busy} onApproval={respondApproval} onQuestion={respondQuestion} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={<WelcomeMessage />}
        ListHeaderComponent={historyHasMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="加载更早消息"
            disabled={historyLoadingOlder}
            onPress={() => void loadOlderHistory()}
            style={styles.olderButton}
          >
            {historyLoadingOlder
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.olderText}>加载更早消息</Text>}
          </Pressable>
        ) : undefined}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="发送给 DeepSeek Harness 的消息"
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="给 DSH 发消息…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={12_000}
            editable={connected}
            selectionColor={colors.accent}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="发送消息"
            accessibilityState={{ disabled: !connected || draft.trim().length === 0 }}
            disabled={!connected || draft.trim().length === 0}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.sendButton, pressed && styles.sendPressed, (!connected || draft.trim().length === 0) && styles.sendDisabled]}
          >
            <Send size={19} color={colors.white} />
          </Pressable>
        </View>
        <Text style={styles.composerHint}>所有操作仍遵循设备端 Harness 的权限策略。</Text>
      </View>

      <ModelPicker
        visible={modelPickerOpen}
        models={sessionModels}
        onClose={() => setModelPickerOpen(false)}
        onPick={pickModel}
      />
      <PermissionPicker visible={permissionPickerOpen} permissions={permissions} onClose={() => setPermissionPickerOpen(false)} onPick={pickPermission} />
    </KeyboardAvoidingView>
  )
}

function PermissionPicker({ visible, permissions, onClose, onPick }: {
  visible: boolean
  permissions?: PermissionSelect
  onClose: () => void
  onPick: (preset: string) => void
}) {
  if (permissions === undefined) return null
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>审批模式</Text><IconButton label="关闭" icon={X} onPress={onClose} /></View>
          {permissions.options.filter(option => option.value !== 'custom').map(option => {
            const current = option.value === permissions.currentValue
            return (
              <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: current }} onPress={() => onPick(option.value)} style={[styles.permissionOption, current && styles.modelOptionCurrent]}>
                <View style={styles.permissionOptionCopy}><Text style={styles.modelOptionName}>{option.name}</Text>{option.description !== undefined && <Text style={styles.permissionOptionDescription}>{option.description}</Text>}</View>
                {current && <Check size={16} color={colors.primary} />}
              </Pressable>
            )
          })}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function sessionPermissions(session: RemoteSession): PermissionSelect | undefined {
  const value = session.projections?.values?.permissions
  if (typeof value !== 'object' || value === null) return undefined
  const source = value as { currentValue?: unknown; options?: unknown }
  if (typeof source.currentValue !== 'string' || !Array.isArray(source.options)) return undefined
  const options = source.options.flatMap(option => {
    if (typeof option !== 'object' || option === null) return []
    const item = option as { value?: unknown; name?: unknown; description?: unknown }
    if (typeof item.value !== 'string' || typeof item.name !== 'string') return []
    return [{ value: item.value, name: item.name, ...(typeof item.description === 'string' ? { description: item.description } : {}) }]
  })
  return { currentValue: source.currentValue, options }
}

function ModelPicker({ visible, models, onClose, onPick }: {
  visible: boolean
  models?: import('../types').SessionModels
  onClose: () => void
  onPick: (group: ModelProviderGroup, model: ModelCatalogModel) => void
}) {
  if (models === undefined) return null
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>选择模型</Text>
            <IconButton label="关闭" icon={X} onPress={onClose} />
          </View>
          {models.groups.map(group => (
            <View key={group.id} style={styles.modelGroupBlock}>
              <Text style={styles.modelGroupTitle}>{group.name}</Text>
              {group.models.map(model => {
                const current = models.current.provider === group.id && models.current.model === model.id
                return (
                  <Pressable
                    key={model.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: current }}
                    onPress={() => onPick(group, model)}
                    style={[styles.modelOption, current && styles.modelOptionCurrent]}
                  >
                    <Text style={styles.modelOptionName} numberOfLines={1}>{model.name}</Text>
                    {current && <Check size={16} color={colors.primary} />}
                  </Pressable>
                )
              })}
            </View>
          ))}
          {models.failures.length > 0 && (
            <Text style={styles.modelFailures}>{models.failures.map(failure => failure.message).join('; ')}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function sessionTitle(sessionId: string): string {
  return sessionId.length > 24 ? `${sessionId.slice(0, 12)}…${sessionId.slice(-6)}` : sessionId
}

function ChatItemView({ item, busyAction, onApproval, onQuestion }: {
  item: ChatItem
  busyAction?: string
  onApproval: (itemId: string, outcome: 'allowed-once' | 'rejected') => Promise<void>
  onQuestion: (itemId: string, selected: Record<string, string[]>) => Promise<void>
}) {
  if (item.kind === 'approval') return <ApprovalCard item={item} busy={busyAction === `approval:${item.id}`} onRespond={onApproval} />
  if (item.kind === 'question') return <QuestionCard item={item} busy={busyAction === `question:${item.id}`} onRespond={onQuestion} />
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
        <Text style={styles.messageLabel}>{user ? '你' : item.role === 'system' ? '系统' : 'DSH'}</Text>
        <FormattedText text={item.text} />
        {item.streaming && <View style={styles.streamingCursor} accessibilityLabel="正在生成回复" />}
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
  const stateText = item.state === 'running' ? '运行中' : item.state === 'failed' ? '失败' : '已完成'
  return (
    <View style={styles.toolRow}>
      <View style={styles.toolIcon}><Code2 size={17} color={colors.primary} /></View>
      <View style={styles.toolCopy}>
        <Text style={styles.toolName}>{item.toolName}</Text>
        {(item.arguments ?? item.summary) !== undefined && <Text style={styles.toolSummary} numberOfLines={3}>{item.arguments ?? item.summary}</Text>}
      </View>
      <Text style={[styles.toolState, item.state === 'failed' && styles.toolFailed]}>{stateText}</Text>
    </View>
  )
}

function ApprovalCard({ item, busy, onRespond }: {
  item: ApprovalActivity
  busy: boolean
  onRespond: (itemId: string, outcome: 'allowed-once' | 'rejected') => Promise<void>
}) {
  if (item.outcome !== undefined) {
    const denied = item.outcome === 'rejected' || item.outcome === 'cancelled' || item.outcome === 'unavailable'
    return (
      <View style={styles.permissionResolved}>
        {denied ? <X size={18} color={colors.danger} /> : <Check size={18} color={colors.success} />}
        <Text style={styles.permissionResolvedText}>{denied ? '操作未允许' : '已允许一次'}</Text>
      </View>
    )
  }
  return (
    <View style={styles.permissionCard} accessibilityRole="alert">
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIcon}><ShieldAlert size={20} color={colors.warning} /></View>
        <View style={styles.permissionHeaderCopy}>
          <Text style={styles.permissionTitle}>需要你的授权</Text>
          <Text style={styles.permissionKind}>{item.toolName} on host</Text>
        </View>
      </View>
      {item.reason !== undefined && (
        <View style={styles.permissionDetail}>
          <Text selectable style={styles.permissionText}>{item.reason}</Text>
        </View>
      )}
      <Text style={styles.permissionScope}>“仅允许一次”只对当前请求生效，且不会绕过设备端策略。</Text>
      <View style={styles.permissionActions}>
        <Button label="仅允许一次" onPress={() => void onRespond(item.id, 'allowed-once')} loading={busy} />
        <Button label="拒绝" variant="quiet" onPress={() => void onRespond(item.id, 'rejected')} disabled={busy} />
      </View>
    </View>
  )
}

function QuestionCard({ item, busy, onRespond }: {
  item: QuestionActivity
  busy: boolean
  onRespond: (itemId: string, selected: Record<string, string[]>) => Promise<void>
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({})

  if (item.outcome !== undefined) {
    return (
      <View style={styles.permissionResolved}>
        <Check size={18} color={colors.success} />
        <Text style={styles.permissionResolvedText}>{item.outcome === 'answered' ? '已回答问题' : '已取消问题'}</Text>
      </View>
    )
  }

  const toggle = (questionId: string, label: string, multi: boolean) => {
    setSelected(current => {
      const values = current[questionId] ?? []
      const next = multi
        ? (values.includes(label) ? values.filter(value => value !== label) : [...values, label])
        : values.includes(label) ? [] : [label]
      return { ...current, [questionId]: next }
    })
  }

  const allAnswered = item.questions.every(question => (selected[question.id] ?? []).length > 0)

  return (
    <View style={styles.questionCard} accessibilityRole="alert">
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIcon}><ShieldAlert size={20} color={colors.accent} /></View>
        <View style={styles.permissionHeaderCopy}>
          <Text style={styles.permissionTitle}>DSH 需要确认</Text>
          <Text style={styles.permissionKind}>回答后继续</Text>
        </View>
      </View>
      {item.questions.map(question => (
        <View key={question.id} style={styles.questionBlock}>
          <Text style={styles.questionText}>{question.question}</Text>
          {question.detail !== undefined && <Text selectable style={styles.questionDetail}>{question.detail}</Text>}
          {(question.options ?? []).map(option => {
            const chosen = (selected[question.id] ?? []).includes(option.label)
            return (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                onPress={() => toggle(question.id, option.label, question.multiSelect === true)}
                style={[styles.optionRow, chosen && styles.optionChosen]}
              >
                <View style={[styles.optionDot, chosen && styles.optionDotChosen]}>{chosen && <Check size={12} color={colors.white} />}</View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </Pressable>
            )
          })}
        </View>
      ))}
      <Button label="提交回答" onPress={() => void onRespond(item.id, selected)} loading={busy} disabled={!allAnswered} />
    </View>
  )
}

function WelcomeMessage() {
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeIcon}><Bot size={25} color={colors.primary} /></View>
      <Text style={styles.welcomeTitle}>继续这段对话</Text>
      <Text style={styles.welcomeBody}>告诉 DSH 你想检查、解释或修改什么。工具调用和授权请求会直接显示在对话中。</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  sessionControls: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  modelChip: { minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.surfaceStrong },
  permissionChip: { minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  modelChipText: { ...type.smallStrong, color: colors.ink, flexShrink: 1 },
  olderButton: { alignSelf: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  olderText: { ...type.smallStrong, color: colors.primary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '70%', backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { ...type.heading, color: colors.ink },
  modelGroupBlock: { marginBottom: spacing.md },
  modelGroupTitle: { ...type.caption, color: colors.muted, textTransform: 'uppercase', marginBottom: spacing.xs },
  modelOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: spacing.xs },
  modelOptionCurrent: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modelOptionName: { ...type.small, color: colors.ink, flex: 1 },
  permissionOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, marginBottom: spacing.xs },
  permissionOptionCopy: { flex: 1 },
  permissionOptionDescription: { ...type.caption, color: colors.muted, marginTop: 2 },
  modelFailures: { ...type.caption, color: colors.danger, marginTop: spacing.sm },
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
  questionCard: { borderRadius: radius.lg, backgroundColor: colors.accentSoft, padding: spacing.md, gap: spacing.md },
  permissionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  permissionIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  permissionHeaderCopy: { flex: 1 },
  permissionTitle: { ...type.bodyStrong, color: colors.ink },
  permissionKind: { ...type.small, color: colors.muted },
  permissionDetail: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm },
  permissionCode: { fontFamily: 'monospace', fontSize: 14, lineHeight: 21, color: colors.ink },
  permissionText: { ...type.body, color: colors.ink },
  permissionScope: { ...type.caption, color: colors.muted },
  permissionActions: { gap: spacing.xs },
  permissionResolved: { borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.sm, flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  permissionResolvedText: { ...type.smallStrong, color: colors.ink },
  questionBlock: { gap: spacing.xs },
  questionText: { ...type.bodyStrong, color: colors.ink },
  questionDetail: { ...type.small, color: colors.muted },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  optionChosen: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionDot: { width: 20, height: 20, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  optionDotChosen: { borderColor: colors.accent, backgroundColor: colors.accent },
  optionLabel: { ...type.small, color: colors.ink, flex: 1 },
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
