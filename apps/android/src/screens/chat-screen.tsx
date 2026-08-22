import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Bot, Check, ChevronDown, ChevronRight, CircleStop, Code2, ImagePlus, Images, RefreshCw, Send, ShieldAlert, Sparkles, User, X } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import { hasVisibleMessageText } from '../state/event-reducer'
import type { ApprovalActivity, ChatItem, ChatMessage, ImageAttachmentLimits, ImageMediaType, ModelCatalogModel, ModelProviderGroup, PermissionSelect, PromptImage, QuestionActivity, RemoteSession, ToolActivity, ToolDisplayDetail } from '../types'
import { Button, IconButton, TopBar } from '../ui/components'
import { NativeMarkdown } from '../ui/markdown'
import { colors, radius, spacing, type } from '../ui/theme'
import { strings as zhCN } from '../locales/i18n'
import { resolveSessionDisplayTitle } from './session-title'

const EMPTY_CHAT_ITEMS: ChatItem[] = []

export function ChatScreen({ onBack }: { onBack: () => void }) {
  const session = useAppStore(state => state.selectedSession)
  const messages = useAppStore(state => session === undefined ? EMPTY_CHAT_ITEMS : state.messages[session.sessionId] ?? EMPTY_CHAT_ITEMS)
  const busy = useAppStore(state => state.busyAction)
  const connection = useAppStore(state => state.connection)
  const historyHasMore = useAppStore(state => state.historyHasMore)
  const historyLoadingOlder = useAppStore(state => state.historyLoadingOlder)
  const sessionModels = useAppStore(state => state.sessionModels)
  const modelSelecting = useAppStore(state => state.modelSelecting)
  const permissionSelecting = useAppStore(state => state.permissionSelecting)
  const sendMessage = useAppStore(state => state.sendMessage)
  const stopSession = useAppStore(state => state.stopSession)
  const reconnect = useAppStore(state => state.reconnect)
  const openSession = useAppStore(state => state.openSession)
  const respondApproval = useAppStore(state => state.respondApproval)
  const respondQuestion = useAppStore(state => state.respondQuestion)
  const loadOlderHistory = useAppStore(state => state.loadOlderHistory)
  const selectModel = useAppStore(state => state.selectModel)
  const selectPermission = useAppStore(state => state.selectPermission)
  const [draft, setDraft] = useState('')
  const [images, setImages] = useState<PromptImage[]>([])
  const [pickingImages, setPickingImages] = useState(false)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [permissionPickerOpen, setPermissionPickerOpen] = useState(false)
  const [reconnectingSession, setReconnectingSession] = useState(false)
  const listRef = useRef<FlatList<ChatItem>>(null)
  const visibleMessages = messages.filter(item =>
    item.kind !== 'message'
      || hasVisibleMessageText(item.text)
      || hasVisibleMessageText(item.reasoning ?? '')
      || (item.images?.length ?? 0) > 0)
  const lastItem = visibleMessages.at(-1)
  const lastContentVersion = lastItem?.kind === 'message'
    ? `${lastItem.id}:${lastItem.text.length}:${lastItem.reasoning?.length ?? 0}`
    : undefined

  useEffect(() => {
    if (messages.length > 0) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
  }, [messages.length, lastContentVersion])

  if (session === undefined) return null

  const submit = async () => {
    const text = draft.trim()
    if (text.length === 0 && images.length === 0) return
    const submittedImages = images
    setDraft('')
    setImages([])
    if (!await sendMessage(text, submittedImages)) {
      setDraft(text)
      setImages(submittedImages)
    }
  }

  const pickImages = async () => {
    const limits = sessionImageLimits(session)
    const remaining = limits === undefined ? 0 : Math.max(0, limits.maxImagesPerMessage - images.length)
    if (limits !== undefined && remaining === 0) {
      Alert.alert(zhCN.chat.imageLimitTitle, zhCN.chat.tooManyImages(limits.maxImagesPerMessage))
      return
    }
    setPickingImages(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        orderedSelection: true,
        allowsEditing: false,
        quality: 1,
        base64: true,
      })
      if (result.canceled) return
      const picked = result.assets.map(promptImageFromAsset)
      const next = [...images, ...picked]
      const problem = validatePromptImages(next, limits)
      if (problem !== undefined) {
        Alert.alert(zhCN.chat.imageLimitTitle, problem)
        return
      }
      setImages(next)
    } catch {
      Alert.alert(zhCN.chat.imagePickerFailedTitle, zhCN.chat.imagePickerFailedBody)
    } finally {
      setPickingImages(false)
    }
  }

  const pickModel = async (group: ModelProviderGroup, model: ModelCatalogModel) => {
    setModelPickerOpen(false)
    await selectModel({ provider: group.id, model: model.id })
  }

  const reconnectCurrentSession = async () => {
    if (reconnectingSession) return
    setReconnectingSession(true)
    try {
      if (!await reconnect()) return
      const currentState = useAppStore.getState()
      const currentSession = currentState.sessions.find(item => item.sessionId === session.sessionId)
        ?? currentState.selectedSession
        ?? session
      await openSession(currentSession)
    } finally {
      setReconnectingSession(false)
    }
  }

  const connectionRetrying = reconnectingSession || connection.phase === 'connecting' || connection.phase === 'reconnecting'
  const connected = connection.phase === 'connected' && !reconnectingSession
  const permissions = sessionPermissions(session)
  const currentPermission = permissions?.options.find(option => option.value === permissions.currentValue)

  const pickPermission = (preset: string) => {
    setPermissionPickerOpen(false)
    const apply = () => void selectPermission(preset)
    if (preset === 'danger-full-access') {
      Alert.alert(zhCN.chat.fullAccessTitle, zhCN.chat.fullAccessBody, [
        { text: zhCN.common.cancel, style: 'cancel' },
        { text: zhCN.chat.enable, style: 'destructive', onPress: apply },
      ])
    } else apply()
  }
  return (
    <ChatKeyboardInset>
      <TopBar
        title={sessionTitle(session)}
        onBack={onBack}
        action={!connected
          ? <IconButton label={zhCN.chat.reconnect} icon={RefreshCw} onPress={() => void reconnectCurrentSession()} disabled={connectionRetrying} />
          : busy === 'send-message' || session.running
            ? <IconButton label={zhCN.chat.stop} icon={CircleStop} onPress={() => void stopSession()} disabled={busy === 'stop-session'} />
            : undefined}
      />

      <View style={styles.sessionControls}>
        {sessionModels !== undefined && (
          <Pressable accessibilityRole="button" accessibilityLabel={zhCN.chat.selectModel} onPress={() => setModelPickerOpen(true)} style={styles.modelChip}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.modelChipText} numberOfLines={1}>{sessionModels.current.model}</Text>
            {modelSelecting ? <ActivityIndicator size="small" color={colors.muted} /> : <ChevronDown size={14} color={colors.muted} />}
          </Pressable>
        )}
        {permissions !== undefined && (
          <Pressable accessibilityRole="button" accessibilityLabel={zhCN.chat.approvalModeLabel(currentPermission?.name ?? permissions.currentValue)} onPress={() => setPermissionPickerOpen(true)} style={styles.permissionChip}>
            <ShieldAlert size={14} color={colors.primary} />
            <Text style={styles.modelChipText} numberOfLines={1}>{currentPermission?.name ?? permissions.currentValue}</Text>
            {permissionSelecting ? <ActivityIndicator size="small" color={colors.muted} /> : <ChevronDown size={14} color={colors.muted} />}
          </Pressable>
        )}
      </View>

      {!connected && (
        <View style={styles.connectionBanner} accessibilityRole="alert">
          <View style={styles.connectionDot} />
          <Text style={styles.connectionBannerText}>{connectionRetrying ? zhCN.chat.reconnecting : zhCN.chat.offline}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[styles.listContent, visibleMessages.length === 0 && styles.emptyList]}
        data={visibleMessages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChatItemView item={item} busyAction={busy} onApproval={respondApproval} onQuestion={respondQuestion} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={<WelcomeMessage />}
        ListHeaderComponent={historyHasMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={zhCN.chat.older}
            disabled={historyLoadingOlder}
            onPress={() => void loadOlderHistory()}
            style={styles.olderButton}
          >
            {historyLoadingOlder
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.olderText}>{zhCN.chat.older}</Text>}
          </Pressable>
        ) : undefined}
      />

      <View style={styles.composerWrap}>
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageTray}>
            {images.map((image, index) => (
              <View key={`${image.uri}:${index}`} style={styles.imagePreviewWrap}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={zhCN.chat.removeImage(image.name ?? `${index + 1}`)}
                  onPress={() => setImages(current => current.filter((_, imageIndex) => imageIndex !== index))}
                  style={styles.removeImageButton}
                >
                  <X size={13} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={zhCN.chat.addImages}
            accessibilityState={{ disabled: !connected || pickingImages || busy === 'send-message' }}
            disabled={!connected || pickingImages || busy === 'send-message'}
            onPress={() => void pickImages()}
            style={({ pressed }) => [styles.attachButton, pressed && styles.attachPressed]}
          >
            {pickingImages
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <ImagePlus size={20} color={connected ? colors.primary : colors.disabled} />}
          </Pressable>
          <TextInput
            accessibilityLabel={zhCN.chat.messageLabel}
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder={zhCN.chat.placeholder}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={12_000}
            editable={connected}
            selectionColor={colors.accent}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={zhCN.chat.send}
            accessibilityState={{ disabled: !connected || (draft.trim().length === 0 && images.length === 0) }}
            disabled={!connected || (draft.trim().length === 0 && images.length === 0)}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.sendButton, pressed && styles.sendPressed, (!connected || (draft.trim().length === 0 && images.length === 0)) && styles.sendDisabled]}
          >
            <Send size={19} color={colors.white} />
          </Pressable>
        </View>
        <Text style={styles.composerHint}>{zhCN.chat.policyHint}</Text>
      </View>

      <ModelPicker
        visible={modelPickerOpen}
        models={sessionModels}
        onClose={() => setModelPickerOpen(false)}
        onPick={pickModel}
      />
      <PermissionPicker visible={permissionPickerOpen} permissions={permissions} onClose={() => setPermissionPickerOpen(false)} onPick={pickPermission} />
    </ChatKeyboardInset>
  )
}

function ChatKeyboardInset({ children }: { children: ReactNode }) {
  // Edge-to-edge Android windows do not consistently resize around the IME,
  // even when the Activity requests adjustResize. KeyboardAvoidingView measures
  // the actual overlap, so it is a no-op when the window already resized and
  // adds only the missing inset when it did not. Its hide event also clears the
  // padding instead of leaving the conversation at the compact keyboard height.
  return <KeyboardAvoidingView style={styles.flex} behavior="padding">{children}</KeyboardAvoidingView>
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
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{zhCN.chat.approvalMode}</Text><IconButton label={zhCN.common.close} icon={X} onPress={onClose} /></View>
          {permissions.options.filter(option => option.value !== 'custom').map(option => {
            const current = option.value === permissions.currentValue
            return (
              <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: current }} onPress={() => onPick(option.value)} style={[styles.permissionOption, current && styles.modelOptionCurrent]}>
                <View style={styles.permissionOptionCopy}><Text style={styles.permissionOptionName}>{option.name}</Text>{option.description !== undefined && <Text style={styles.permissionOptionDescription}>{option.description}</Text>}</View>
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

const IMAGE_MEDIA_TYPES: readonly ImageMediaType[] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function sessionImageLimits(session: RemoteSession): ImageAttachmentLimits | undefined {
  const value = session.projections?.values?.imageLimits
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const limits = value as Partial<ImageAttachmentLimits>
  if (!positiveNumber(limits.maxImageBytes)
    || !positiveNumber(limits.maxImagesPerMessage)
    || !positiveNumber(limits.maxMessageImageBytes)
    || !positiveNumber(limits.maxImagePixels)
    || !positiveNumber(limits.maxImageDimension)
    || !Array.isArray(limits.mediaTypes)) return undefined
  const mediaTypes = limits.mediaTypes.filter((mediaType): mediaType is ImageMediaType =>
    typeof mediaType === 'string' && IMAGE_MEDIA_TYPES.includes(mediaType as ImageMediaType))
  if (mediaTypes.length === 0) return undefined
  return {
    maxImageBytes: limits.maxImageBytes,
    maxImagesPerMessage: limits.maxImagesPerMessage,
    maxMessageImageBytes: limits.maxMessageImageBytes,
    maxImagePixels: limits.maxImagePixels,
    maxImageDimension: limits.maxImageDimension,
    mediaTypes,
  }
}

function promptImageFromAsset(asset: ImagePicker.ImagePickerAsset): PromptImage {
  if (asset.base64 === undefined || asset.base64 === null || asset.base64.length === 0) {
    throw new Error('missing-image-data')
  }
  const mediaType = imageMediaType(asset.mimeType, asset.fileName ?? asset.uri)
  if (mediaType === undefined) throw new Error('unsupported-image-type')
  return {
    uri: asset.uri,
    mediaType,
    data: asset.base64,
    bytes: decodedBase64Bytes(asset.base64),
    width: asset.width,
    height: asset.height,
    ...(asset.fileName === undefined || asset.fileName === null ? {} : { name: asset.fileName.split(/[\\/]/).at(-1)?.slice(0, 255) }),
  }
}

function validatePromptImages(images: PromptImage[], limits?: ImageAttachmentLimits): string | undefined {
  if (limits === undefined) return undefined
  if (images.length > limits.maxImagesPerMessage) return zhCN.chat.tooManyImages(limits.maxImagesPerMessage)
  let totalBytes = 0
  for (const image of images) {
    const label = image.name ?? zhCN.chat.unnamedImage
    if (!limits.mediaTypes.includes(image.mediaType)) return zhCN.chat.unsupportedImage(label)
    if (image.bytes > limits.maxImageBytes) return zhCN.chat.imageTooLarge(label, formatBytes(limits.maxImageBytes))
    if (image.width > limits.maxImageDimension || image.height > limits.maxImageDimension) {
      return zhCN.chat.imageDimensionsTooLarge(label, limits.maxImageDimension)
    }
    if (image.width * image.height > limits.maxImagePixels) return zhCN.chat.imagePixelsTooLarge(label)
    totalBytes += image.bytes
  }
  return totalBytes > limits.maxMessageImageBytes
    ? zhCN.chat.imagesTooLarge(formatBytes(limits.maxMessageImageBytes))
    : undefined
}

function imageMediaType(mimeType: string | undefined, name: string): ImageMediaType | undefined {
  const normalized = mimeType?.toLowerCase()
  if (IMAGE_MEDIA_TYPES.includes(normalized as ImageMediaType)) return normalized as ImageMediaType
  const extension = name.split(/[?#]/, 1)[0]?.split('.').at(-1)?.toLowerCase()
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'gif') return 'image/gif'
  return undefined
}

function decodedBase64Bytes(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor(value.length * 3 / 4) - padding
}

function positiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Math.floor(bytes / (1024 * 1024))} MB`
    : `${Math.floor(bytes / 1024)} KB`
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
            <Text style={styles.modalTitle}>{zhCN.chat.selectModel}</Text>
            <IconButton label={zhCN.common.close} icon={X} onPress={onClose} />
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

function sessionTitle(session: RemoteSession): string {
  const title = resolveSessionDisplayTitle(session)
  if (title !== undefined) return title
  if (session.blank && session.parentSessionId === undefined) return zhCN.sessions.untitled
  return session.parentSessionId === undefined ? zhCN.sessions.untitled : zhCN.sessions.child
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
  if (item.role === 'assistant'
    && !hasVisibleMessageText(item.text)
    && hasVisibleMessageText(item.reasoning ?? '')) return <ReasoningDisclosure item={item} />
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
        <Text style={styles.messageLabel}>{user ? zhCN.chat.you : item.role === 'system' ? zhCN.chat.system : 'Remote'}</Text>
        {item.images !== undefined && item.images.length > 0 && (
          <View style={[styles.messageImages, user && styles.messageImagesUser]}>
            {item.images.map((image, index) => image.uri !== undefined
              ? <Image key={`${image.uri}:${index}`} source={{ uri: image.uri }} style={styles.messageImage} resizeMode="cover" />
              : (
                  <View key={`${image.name ?? 'image'}:${index}`} style={styles.messageImagePlaceholder}>
                    <Images size={20} color={colors.primary} />
                    <Text style={styles.messageImageName} numberOfLines={1}>{image.name ?? zhCN.chat.unnamedImage}</Text>
                  </View>
                ))}
          </View>
        )}
        {item.role === 'assistant' && hasVisibleMessageText(item.reasoning ?? '') && <ReasoningDisclosure item={item} embedded />}
        {hasVisibleMessageText(item.text) && <NativeMarkdown text={item.text} />}
        {item.streaming && item.streamingPhase !== 'reasoning' && <View style={styles.streamingCursor} accessibilityLabel={zhCN.chat.generating} />}
      </View>
    </View>
  )
}

function ReasoningDisclosure({ item, embedded = false }: { item: ChatMessage; embedded?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const active = item.streamingPhase === 'reasoning'
  const label = active ? zhCN.chat.reasoningActive : zhCN.chat.reasoning
  const preview = compactActivityText(item.reasoning) ?? ''
  const actionLabel = expanded ? zhCN.chat.reasoningCollapse : zhCN.chat.reasoningExpand
  return (
    <View style={[styles.reasoningCard, embedded && styles.reasoningCardEmbedded]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}。${preview}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [styles.reasoningHeader, pressed && styles.reasoningHeaderPressed]}
      >
        <Sparkles size={16} color={active ? colors.accent : colors.muted} />
        <Text style={[styles.reasoningLabel, active && styles.reasoningLabelActive]}>{label}</Text>
        <Text style={styles.activitySeparator}>·</Text>
        <Text style={styles.reasoningPreview} numberOfLines={1}>{preview}</Text>
        {expanded
          ? <ChevronDown size={17} color={colors.muted} />
          : <ChevronRight size={17} color={colors.muted} />}
      </Pressable>
      {expanded && <View style={styles.reasoningBody}><NativeMarkdown text={item.reasoning ?? ''} /></View>}
    </View>
  )
}

function ToolRow({ item }: { item: ToolActivity }) {
  const [expanded, setExpanded] = useState(false)
  const stateText = item.state === 'running' ? zhCN.status.running : item.state === 'failed' ? zhCN.chat.failed : zhCN.chat.completed
  const detail = compactActivityText(item.summary ?? item.arguments)
  const hasDetail = item.callDetail !== undefined || item.resultDetail !== undefined
  return (
    <View style={[styles.toolCard, expanded && styles.toolCardExpanded]}>
      <Pressable
        accessibilityRole={hasDetail ? 'button' : undefined}
        accessibilityLabel={hasDetail ? (expanded ? zhCN.chat.toolCollapse(item.toolName) : zhCN.chat.toolExpand(item.toolName)) : undefined}
        accessibilityState={hasDetail ? { expanded } : undefined}
        disabled={!hasDetail}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [styles.toolRow, pressed && hasDetail && styles.toolRowPressed]}
      >
        <View style={styles.toolIcon}><Code2 size={18} color={colors.muted} /></View>
        <View style={styles.toolCopy}>
          <Text style={styles.toolName} numberOfLines={1}>{item.toolName}</Text>
          {detail !== undefined && <Text style={styles.activitySeparator}>·</Text>}
          {detail !== undefined && <Text style={styles.toolSummary} numberOfLines={1}>{detail}</Text>}
        </View>
        {item.state !== 'finished' && <Text style={[styles.toolState, item.state === 'failed' && styles.toolFailed]}>{stateText}</Text>}
        {hasDetail && (expanded
          ? <ChevronDown size={17} color={colors.muted} />
          : <ChevronRight size={17} color={colors.muted} />)}
      </Pressable>
      {expanded && hasDetail && (
        <View style={styles.toolDetails}>
          {item.callDetail !== undefined && <ToolDetailView label={zhCN.chat.toolCall} detail={item.callDetail} />}
          {item.resultDetail !== undefined && <ToolDetailView label={zhCN.chat.toolResult} detail={item.resultDetail} />}
        </View>
      )}
    </View>
  )
}

function ToolDetailView({ label, detail }: { label: string; detail: ToolDisplayDetail }) {
  return (
    <View style={styles.toolDetailBlock}>
      <Text style={styles.toolDetailLabel}>{label}</Text>
      {detail.format === 'markdown'
        ? <NativeMarkdown text={detail.text} />
        : <Text selectable style={styles.toolDetailCode}>{detail.text}</Text>}
      {detail.truncated && <Text style={styles.toolDetailTruncated}>{zhCN.chat.toolTruncated}</Text>}
    </View>
  )
}

function compactActivityText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const compact = value.replace(/\\[nrt]/g, ' ').replace(/\s+/g, ' ').trim()
  return compact.length === 0 ? undefined : compact
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
        <Text style={styles.permissionResolvedText}>{denied ? zhCN.chat.denied : zhCN.chat.allowedOnce}</Text>
      </View>
    )
  }
  return (
    <View style={styles.permissionCard} accessibilityRole="alert">
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIcon}><ShieldAlert size={20} color={colors.warning} /></View>
        <View style={styles.permissionHeaderCopy}>
          <Text style={styles.permissionTitle}>{zhCN.chat.permissionTitle}</Text>
          <Text style={styles.permissionKind}>{zhCN.chat.hostOperation(item.toolName)}</Text>
        </View>
      </View>
      {item.reason !== undefined && (
        <View style={styles.permissionDetail}>
          <Text selectable style={styles.permissionText}>{item.reason}</Text>
        </View>
      )}
      <Text style={styles.permissionScope}>{zhCN.chat.permissionScope}</Text>
      <View style={styles.permissionActions}>
        <Button label={zhCN.chat.allowOnce} onPress={() => void onRespond(item.id, 'allowed-once')} loading={busy} />
        <Button label={zhCN.chat.deny} variant="quiet" onPress={() => void onRespond(item.id, 'rejected')} disabled={busy} />
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
        <Text style={styles.permissionResolvedText}>{item.outcome === 'answered' ? zhCN.chat.answered : zhCN.chat.questionCancelled}</Text>
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
          <Text style={styles.permissionTitle}>{zhCN.chat.questionTitle}</Text>
          <Text style={styles.permissionKind}>{zhCN.chat.answerToContinue}</Text>
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
      <Button label={zhCN.chat.submitAnswer} onPress={() => void onRespond(item.id, selected)} loading={busy} disabled={!allAnswered} />
    </View>
  )
}

function WelcomeMessage() {
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeIcon}><Bot size={25} color={colors.primary} /></View>
      <Text style={styles.welcomeTitle}>{zhCN.chat.welcomeTitle}</Text>
      <Text style={styles.welcomeBody}>{zhCN.chat.welcomeBody}</Text>
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
  permissionOptionName: { ...type.small, color: colors.ink },
  permissionOptionDescription: { ...type.caption, color: colors.muted, marginTop: 2 },
  modelFailures: { ...type.caption, color: colors.danger, marginTop: spacing.sm },
  connectionBanner: { minHeight: 40, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, backgroundColor: colors.warningSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  connectionDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.warning },
  connectionBannerText: { ...type.small, color: colors.ink, flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxs },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginVertical: spacing.xs },
  messageRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarUser: { backgroundColor: colors.primary },
  avatarAssistant: { backgroundColor: colors.primarySoft },
  messageBody: { flex: 1, maxWidth: '88%' },
  messageBodyUser: { alignItems: 'flex-end' },
  messageLabel: { ...type.caption, color: colors.muted, marginBottom: 4 },
  messageImages: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  messageImagesUser: { justifyContent: 'flex-end' },
  messageImage: { width: 132, height: 104, borderRadius: radius.md, backgroundColor: colors.surfaceStrong },
  messageImagePlaceholder: { width: 132, minHeight: 76, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, gap: spacing.xs },
  messageImageName: { ...type.caption, color: colors.primary, maxWidth: '100%' },
  reasoningCard: { alignSelf: 'stretch', borderRadius: radius.md, overflow: 'hidden' },
  reasoningCardEmbedded: { marginBottom: spacing.xs },
  reasoningHeader: { minHeight: 48, paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reasoningHeaderPressed: { backgroundColor: colors.surfaceStrong },
  reasoningLabel: { ...type.smallStrong, color: colors.ink },
  reasoningLabelActive: { color: colors.accent },
  reasoningPreview: { ...type.small, color: colors.muted, flex: 1 },
  activitySeparator: { ...type.small, color: colors.subtle },
  reasoningBody: { backgroundColor: colors.surface, padding: spacing.sm, marginHorizontal: spacing.xs, marginBottom: spacing.xs, borderRadius: radius.sm },
  streamingCursor: { width: 7, height: 16, backgroundColor: colors.accent, borderRadius: 2, marginTop: 3 },
  toolCard: { borderRadius: radius.md, overflow: 'hidden' },
  toolCardExpanded: { backgroundColor: colors.surface },
  toolRow: { minHeight: 48, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toolRowPressed: { backgroundColor: colors.surfaceStrong },
  toolIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  toolCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolName: { ...type.smallStrong, color: colors.ink },
  toolSummary: { ...type.small, color: colors.muted, flex: 1 },
  toolState: { ...type.caption, color: colors.success },
  toolFailed: { color: colors.danger },
  toolDetails: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator, padding: spacing.sm, gap: spacing.md },
  toolDetailBlock: { gap: spacing.xs },
  toolDetailLabel: { ...type.caption, color: colors.muted },
  toolDetailCode: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20, color: colors.ink, backgroundColor: colors.surfaceStrong, borderRadius: radius.sm, padding: spacing.sm },
  toolDetailTruncated: { ...type.caption, color: colors.warning },
  permissionCard: { borderRadius: radius.lg, backgroundColor: colors.warningSoft, padding: spacing.md, gap: spacing.md, marginVertical: spacing.xs },
  questionCard: { borderRadius: radius.lg, backgroundColor: colors.accentSoft, padding: spacing.md, gap: spacing.md, marginVertical: spacing.xs },
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
  permissionResolved: { borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.sm, flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginVertical: spacing.xs },
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
  imageTray: { gap: spacing.xs, paddingBottom: spacing.xs },
  imagePreviewWrap: { width: 72, height: 72 },
  imagePreview: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceStrong },
  removeImageButton: { position: 'absolute', right: -3, top: -3, width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  composer: { minHeight: 52, maxHeight: 144, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: spacing.sm, paddingRight: 5, paddingVertical: 5 },
  attachButton: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  attachPressed: { backgroundColor: colors.primarySoft },
  composerInput: { ...type.body, color: colors.ink, flex: 1, minHeight: 40, maxHeight: 126, paddingVertical: 8, paddingLeft: spacing.xs },
  sendButton: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendPressed: { backgroundColor: colors.primaryPressed },
  sendDisabled: { backgroundColor: colors.disabled },
  composerHint: { ...type.caption, color: colors.muted, textAlign: 'center', marginTop: 5 },
})
