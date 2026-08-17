import { useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, KeyRound, LockKeyhole, RotateCcw, Settings } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import { Button, Field, KeyValue, Screen, TopBar } from '../ui/components'
import { TRANSPORT_PREFERENCE_OPTIONS } from '../types'
import { colors, radius, spacing, type } from '../ui/theme'
import zhCN from '../locales/zh-CN'

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
      <TopBar title={zhCN.setup.title} onBack={onBack} />
      <Screen>
        <Text style={styles.productName}>DeepSeek Harness Remote</Text>
        <Text style={styles.title}>{config === undefined ? zhCN.setup.signIn : zhCN.setup.signInAgain}</Text>
        <Text style={styles.lead}>{zhCN.setup.lead}</Text>

        <View style={styles.form}>
          <View style={styles.methodTabs}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: loginMethod === 'oauth' }} onPress={() => setLoginMethod('oauth')} style={[styles.methodTab, loginMethod === 'oauth' && styles.methodTabActive]}>
              <Text style={[styles.methodTabText, loginMethod === 'oauth' && styles.methodTabTextActive]}>{zhCN.setup.oauth}</Text>
            </Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: loginMethod === 'password' }} onPress={() => setLoginMethod('password')} style={[styles.methodTab, loginMethod === 'password' && styles.methodTabActive]}>
              <Text style={[styles.methodTabText, loginMethod === 'password' && styles.methodTabTextActive]}>{zhCN.setup.passwordMethod}</Text>
            </Pressable>
          </View>

          {loginMethod === 'oauth'
            ? <>
                <Button label={zhCN.setup.zhihu} onPress={() => void signInWithZhihu()} loading={oauthBusy} />
                <Text style={styles.oauthHint}>{zhCN.setup.oauthHint}</Text>
              </>
            : <>
                <Field label={zhCN.setup.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" placeholder={zhCN.setup.emailPlaceholder} />
                <Field label={zhCN.setup.password} value={password} onChangeText={setPassword} secureTextEntry textContentType="password" returnKeyType="go" onSubmitEditing={() => { if (canSubmit) void submit() }} placeholder={zhCN.setup.passwordPlaceholder} hint={zhCN.setup.passwordHint} />
                <Button label={zhCN.setup.title} onPress={() => void submit()} loading={busy} disabled={!canSubmit} />
              </>}

          <View style={styles.serverSection}>
            <Field label={zhCN.setup.server} value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" hint={zhCN.setup.serverHint} placeholder="https://remote.example.com" />
          </View>
        </View>

        <View style={styles.securityNote}>
          <LockKeyhole size={20} color={colors.primary} />
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>{zhCN.setup.trustTitle}</Text>
            <Text style={styles.securityBody}>{zhCN.setup.trustBody}</Text>
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
    zhCN.settings.resetTitle,
    zhCN.settings.resetBody,
    [
      { text: zhCN.common.cancel, style: 'cancel' },
      { text: zhCN.settings.reset, style: 'destructive', onPress: () => void reset().then(onReset) },
    ],
  )

  const confirmSignOut = () => Alert.alert(
    zhCN.settings.signOutTitle,
    zhCN.settings.signOutBody,
    [
      { text: zhCN.common.cancel, style: 'cancel' },
      { text: zhCN.settings.signOut, style: 'destructive', onPress: () => void signOut().then(onReset) },
    ],
  )

  return (
    <View style={styles.flex}>
      <TopBar title={zhCN.settings.title} onBack={onBack} />
      <Screen>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsIcon}><Settings size={25} color={colors.primary} /></View>
          <View style={styles.securityCopy}><Text style={styles.settingsTitle}>{zhCN.settings.thisPhone}</Text><Text style={styles.settingsSubtitle}>{identity?.name ?? zhCN.settings.androidDevice}</Text></View>
        </View>

        <Text style={styles.groupLabel}>{zhCN.settings.connection}</Text>
        <View style={styles.group}>
          <KeyValue label={zhCN.settings.server} value={config?.baseUrl ?? zhCN.settings.notConfigured} />
          <KeyValue label={zhCN.settings.account} value={account ?? zhCN.settings.notSignedIn} />
          <KeyValue label={zhCN.settings.loginMethod} value={config?.loginMethod === 'oauth' ? zhCN.setup.oauth : config?.loginMethod === 'password' ? zhCN.setup.passwordMethod : zhCN.common.unknown} />
          <KeyValue label={zhCN.settings.protocol} value="DSH Remote v1" />
        </View>

        <Text style={styles.groupLabel}>{zhCN.settings.transport}</Text>
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
          <Text style={styles.preferenceNote}>{zhCN.settings.transportNote}</Text>
        </View>

        <Text style={styles.groupLabel}>{zhCN.settings.identity}</Text>
        <View style={styles.group}>
          <KeyValue label={zhCN.settings.deviceId} value={shorten(identity?.deviceId)} mono />
          <KeyValue label={zhCN.settings.publicKey} value={fingerprint(identity?.publicKey)} mono />
          <View style={styles.keyNote}><KeyRound size={17} color={colors.muted} /><Text style={styles.keyNoteText}>{zhCN.settings.keyNote}</Text></View>
        </View>

        <View style={styles.resetArea}>
          <Button label={zhCN.settings.signOut} variant="secondary" onPress={confirmSignOut} />
          <View style={styles.resetGap} />
          <Button label={zhCN.settings.resetLocal} icon={RotateCcw} variant="danger" onPress={confirmReset} />
        </View>
      </Screen>
    </View>
  )
}

function shorten(value?: string): string {
  if (value === undefined) return zhCN.common.unavailable
  return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value
}

function fingerprint(value?: string): string {
  if (value === undefined || value.length === 0) return zhCN.common.unavailable
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
