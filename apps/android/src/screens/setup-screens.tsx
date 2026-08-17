import { useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, KeyRound, LockKeyhole, RotateCcw, Settings } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import { Button, Field, KeyValue, Screen, TopBar } from '../ui/components'
import { TRANSPORT_PREFERENCE_OPTIONS } from '../types'
import { colors, radius, spacing, type } from '../ui/theme'

/** Default DSH Remote Server; a build can override it via EXPO_PUBLIC_DSH_REMOTE_SERVER. */
const defaultServerUrl = 'https://dsh.r2049.cn'

export function ServerSetupScreen({ onComplete, onBack }: { onComplete: () => void; onBack?: () => void }) {
  const config = useAppStore(state => state.config)
  const busy = useAppStore(state => state.busyAction === 'server')
  const oauthBusy = useAppStore(state => state.busyAction === 'oauth')
  const configure = useAppStore(state => state.configureServer)
  const startOAuth = useAppStore(state => state.startOAuth)
  const [serverUrl, setServerUrl] = useState(config?.baseUrl ?? process.env.EXPO_PUBLIC_DSH_REMOTE_SERVER ?? defaultServerUrl)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMethod, setLoginMethod] = useState<'oauth' | 'password'>('oauth')

  const submit = async () => {
    if (await configure(serverUrl, email, password)) onComplete()
  }

  const signInWithZhihu = async () => {
    const url = await startOAuth(serverUrl)
    if (url !== undefined) await Linking.openURL(url)
  }

  const canSubmit = email.trim().length > 0 && password.length > 0

  return (
    <View style={styles.flex}>
      <TopBar title="登录" onBack={onBack} />
      <Screen>
        <Text style={styles.productName}>DeepSeek Harness Remote</Text>
        <Text style={styles.title}>{config === undefined ? '登录账号' : '重新登录'}</Text>
        <Text style={styles.lead}>授权此手机后，即可查看同一账号下的设备并继续对话。</Text>

        <View style={styles.form}>
          <View style={styles.methodTabs}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: loginMethod === 'oauth' }} onPress={() => setLoginMethod('oauth')} style={[styles.methodTab, loginMethod === 'oauth' && styles.methodTabActive]}>
              <Text style={[styles.methodTabText, loginMethod === 'oauth' && styles.methodTabTextActive]}>授权登录</Text>
            </Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: loginMethod === 'password' }} onPress={() => setLoginMethod('password')} style={[styles.methodTab, loginMethod === 'password' && styles.methodTabActive]}>
              <Text style={[styles.methodTabText, loginMethod === 'password' && styles.methodTabTextActive]}>账号密码</Text>
            </Pressable>
          </View>

          {loginMethod === 'oauth'
            ? <>
                <Button label="使用知乎账号授权" onPress={() => void signInWithZhihu()} loading={oauthBusy} />
                <Text style={styles.oauthHint}>将在浏览器中完成授权，成功后自动返回 App。</Text>
              </>
            : <>
                <Field label="邮箱" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" placeholder="请输入登录邮箱" />
                <Field label="密码" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" returnKeyType="go" onSubmitEditing={() => { if (canSubmit) void submit() }} placeholder="请输入账号密码" hint="密码仅用于本次 HTTPS 登录，不会保存在设备上。" />
                <Button label="登录" onPress={() => void submit()} loading={busy} disabled={!canSubmit} />
              </>}

          <View style={styles.serverSection}>
            <Text style={styles.serverLabel}>服务器</Text>
            <Field label="服务地址" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" hint="公网服务必须使用 HTTPS。" placeholder="https://remote.example.com" />
          </View>
        </View>

        <View style={styles.securityNote}>
          <LockKeyhole size={20} color={colors.primary} />
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>端到端设备信任</Text>
            <Text style={styles.securityBody}>服务器只转发加密数据，不会获得此手机的私钥。设备仍需通过同一账号授权。</Text>
          </View>
        </View>
      </Screen>
    </View>
  )
}

export function SettingsScreen({ onBack, onReset }: { onBack: () => void; onReset: () => void }) {
  const config = useAppStore(state => state.config)
  const identity = useAppStore(state => state.identity)
  const account = useAppStore(state => state.account)
  const preference = useAppStore(state => state.transportPreference)
  const setPreference = useAppStore(state => state.setTransportPreference)
  const reset = useAppStore(state => state.resetLocalData)
  const signOut = useAppStore(state => state.signOut)

  const confirmReset = () => Alert.alert(
    '重置 DSH Remote？',
    '这会移除此手机上的服务器配置、设备身份和所有可信设备。之后需要重新登录。',
    [
      { text: '取消', style: 'cancel' },
      { text: '重置', style: 'destructive', onPress: () => void reset().then(onReset) },
    ],
  )

  const confirmSignOut = () => Alert.alert(
    '退出登录？',
    '此手机将从账号中退出，需要重新授权后才能访问设备。',
    [
      { text: '取消', style: 'cancel' },
      { text: '退出登录', style: 'destructive', onPress: () => void signOut().then(onReset) },
    ],
  )

  return (
    <View style={styles.flex}>
      <TopBar title="设置" onBack={onBack} />
      <Screen>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsIcon}><Settings size={25} color={colors.primary} /></View>
          <View style={styles.securityCopy}><Text style={styles.settingsTitle}>此手机</Text><Text style={styles.settingsSubtitle}>{identity?.name ?? 'Android 设备'}</Text></View>
        </View>

        <Text style={styles.groupLabel}>连接</Text>
        <View style={styles.group}>
          <KeyValue label="服务器" value={config?.baseUrl ?? '未配置'} />
          <KeyValue label="账号" value={account ?? '未登录'} />
          <KeyValue label="登录方式" value={config?.loginMethod === 'oauth' ? '授权登录' : config?.loginMethod === 'password' ? '账号密码' : '未知'} />
          <KeyValue label="协议" value="DSH Remote v1" />
        </View>

        <Text style={styles.groupLabel}>传输方式</Text>
        <View style={styles.preferenceList}>
          {TRANSPORT_PREFERENCE_OPTIONS.map(option => {
            const chosen = option.value === preference
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                onPress={() => void setPreference(option.value)}
                style={[styles.preferenceOption, chosen && styles.preferenceOptionChosen]}
              >
                <View style={styles.preferenceCopy}>
                  <Text style={styles.preferenceName}>{option.name}</Text>
                  <Text style={styles.preferenceDescription}>{option.description}</Text>
                </View>
                {chosen && <Check size={17} color={colors.primary} />}
              </Pressable>
            )
          })}
          <Text style={styles.preferenceNote}>修改后会重新连接当前设备；无法直连时始终可以回退到服务器中继。</Text>
        </View>

        <Text style={styles.groupLabel}>设备身份</Text>
        <View style={styles.group}>
          <KeyValue label="设备 ID" value={shorten(identity?.deviceId)} mono />
          <KeyValue label="公钥" value={fingerprint(identity?.publicKey)} mono />
          <View style={styles.keyNote}><KeyRound size={17} color={colors.muted} /><Text style={styles.keyNoteText}>私钥由 Android Keystore 加密保存，永远不会离开此手机。</Text></View>
        </View>

        <View style={styles.resetArea}>
          <Button label="退出登录" variant="secondary" onPress={confirmSignOut} />
          <View style={styles.resetGap} />
          <Button label="重置本地数据" icon={RotateCcw} variant="danger" onPress={confirmReset} />
        </View>
      </Screen>
    </View>
  )
}

function shorten(value?: string): string {
  if (value === undefined) return '不可用'
  return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value
}

function fingerprint(value?: string): string {
  if (value === undefined || value.length === 0) return '不可用'
  return value.slice(0, 24).toUpperCase().match(/.{1,4}/g)?.join(' ') ?? value
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  productName: { ...type.smallStrong, color: colors.primary, marginTop: spacing.xxl, marginBottom: spacing.md },
  title: { ...type.hero, color: colors.ink, maxWidth: 340 },
  lead: { ...type.body, color: colors.muted, marginTop: spacing.sm, maxWidth: 520 },
  form: { marginTop: spacing.xxl, gap: spacing.md },
  methodTabs: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceStrong },
  methodTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  methodTabActive: { backgroundColor: colors.surface },
  methodTabText: { ...type.smallStrong, color: colors.muted },
  methodTabTextActive: { color: colors.primary },
  serverSection: { gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  serverLabel: { ...type.smallStrong, color: colors.muted },
  oauthHint: { ...type.caption, color: colors.muted, textAlign: 'center' },
  securityNote: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, marginTop: spacing.xxxl },
  securityCopy: { flex: 1 },
  securityTitle: { ...type.smallStrong, color: colors.ink },
  securityBody: { ...type.small, color: colors.muted, marginTop: 2 },
  settingsHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xl },
  settingsIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { ...type.heading, color: colors.ink },
  settingsSubtitle: { ...type.small, color: colors.muted },
  groupLabel: { ...type.smallStrong, color: colors.muted, marginTop: spacing.xl, marginBottom: spacing.xs },
  group: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  preferenceList: { gap: spacing.xs },
  preferenceOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  preferenceOptionChosen: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  preferenceCopy: { flex: 1 },
  preferenceName: { ...type.smallStrong, color: colors.ink },
  preferenceDescription: { ...type.caption, color: colors.muted, marginTop: 2 },
  preferenceNote: { ...type.caption, color: colors.muted, marginTop: spacing.xs },
  keyNote: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.md },
  keyNoteText: { ...type.small, color: colors.muted, flex: 1 },
  resetArea: { marginTop: spacing.xxxl },
  resetGap: { height: spacing.sm },
})
