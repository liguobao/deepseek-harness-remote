import { useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { KeyRound, LockKeyhole, RotateCcw, Server, Settings } from 'lucide-react-native'
import { useAppStore } from '../state/store'
import { Button, Field, KeyValue, Screen, TopBar } from '../ui/components'
import { colors, radius, spacing, type } from '../ui/theme'

const localDefault = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080'

export function ServerSetupScreen({ onComplete, onBack }: { onComplete: () => void; onBack?: () => void }) {
  const config = useAppStore(state => state.config)
  const busy = useAppStore(state => state.busyAction === 'server')
  const configure = useAppStore(state => state.configureServer)
  const [serverUrl, setServerUrl] = useState(config?.baseUrl ?? process.env.EXPO_PUBLIC_DSH_REMOTE_SERVER ?? localDefault)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async () => {
    if (await configure(serverUrl, email, password)) onComplete()
  }

  const canSubmit = email.trim().length > 0 && password.length > 0

  return (
    <View style={styles.flex}>
      <TopBar title="Server" onBack={onBack} />
      <Screen>
        <View style={styles.introIcon}><Server size={28} color={colors.primary} /></View>
        <Text style={styles.title}>{config === undefined ? 'Connect your control plane' : 'Remote server'}</Text>
        <Text style={styles.lead}>Sign in with the Server account to authorize this phone. Hosts in the same account appear automatically; sessions stay on the host.</Text>

        <View style={styles.form}>
          <Field
            label="Server address"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="Use HTTPS outside local development."
            placeholder="https://remote.example.com"
          />
          <Field
            label="Account email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            placeholder="user@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => { if (canSubmit) void submit() }}
            hint="Used once for this HTTPS authorization request and never saved."
          />
          <Button label={config === undefined ? 'Sign in and continue' : 'Save and sign in'} onPress={() => void submit()} loading={busy} disabled={!canSubmit} />
        </View>

        <View style={styles.securityNote}>
          <LockKeyhole size={20} color={colors.primary} />
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>Device-to-device trust</Text>
            <Text style={styles.securityBody}>The server routes encrypted frames but does not receive your phone’s private key. Hosts are authorized by account membership.</Text>
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
  const reset = useAppStore(state => state.resetLocalData)

  const confirmReset = () => Alert.alert(
    'Reset DSH Remote?',
    'This removes the server, device identity, and all trusted hosts from this phone. You will need to sign in again.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void reset().then(onReset) },
    ],
  )

  return (
    <View style={styles.flex}>
      <TopBar title="Settings" onBack={onBack} />
      <Screen>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsIcon}><Settings size={25} color={colors.primary} /></View>
          <View style={styles.securityCopy}><Text style={styles.settingsTitle}>This phone</Text><Text style={styles.settingsSubtitle}>{identity?.name ?? 'Android device'}</Text></View>
        </View>

        <Text style={styles.groupLabel}>Connection</Text>
        <View style={styles.group}>
          <KeyValue label="Server" value={config?.baseUrl ?? 'Not configured'} />
          <KeyValue label="Account" value={account ?? 'Not signed in'} />
          <KeyValue label="Protocol" value="DSH Remote v1" />
        </View>

        <Text style={styles.groupLabel}>Identity</Text>
        <View style={styles.group}>
          <KeyValue label="Device ID" value={shorten(identity?.deviceId)} mono />
          <KeyValue label="Public key" value={fingerprint(identity?.publicKey)} mono />
          <View style={styles.keyNote}><KeyRound size={17} color={colors.muted} /><Text style={styles.keyNoteText}>The private key is encrypted by Android Keystore and never leaves this phone.</Text></View>
        </View>

        <View style={styles.resetArea}>
          <Button label="Reset local data" icon={RotateCcw} variant="danger" onPress={confirmReset} />
        </View>
      </Screen>
    </View>
  )
}

function shorten(value?: string): string {
  if (value === undefined) return 'Unavailable'
  return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value
}

function fingerprint(value?: string): string {
  if (value === undefined || value.length === 0) return 'Unavailable'
  return value.slice(0, 24).toUpperCase().match(/.{1,4}/g)?.join(' ') ?? value
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  introIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: { ...type.hero, color: colors.ink, maxWidth: 340 },
  lead: { ...type.body, color: colors.muted, marginTop: spacing.sm, maxWidth: 520 },
  form: { marginTop: spacing.xxl, gap: spacing.md },
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
  keyNote: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.md },
  keyNoteText: { ...type.small, color: colors.muted, flex: 1 },
  resetArea: { marginTop: spacing.xxxl },
})
