import { useEffect, useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { KeyRound, Link2, LockKeyhole, RotateCcw, Server, Settings } from 'lucide-react-native'
import { normalizePairingCode } from '../lib/server-url'
import { useAppStore } from '../state/store'
import type { RemoteDevice } from '../types'
import { Button, Field, KeyValue, Screen, SuccessNotice, TopBar } from '../ui/components'
import { colors, radius, spacing, type } from '../ui/theme'

const localDefault = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080'

export function ServerSetupScreen({ onComplete, onBack }: { onComplete: () => void; onBack?: () => void }) {
  const config = useAppStore(state => state.config)
  const busy = useAppStore(state => state.busyAction === 'server')
  const configure = useAppStore(state => state.configureServer)
  const [serverUrl, setServerUrl] = useState(config?.baseUrl ?? process.env.EXPO_PUBLIC_DSH_REMOTE_SERVER ?? localDefault)

  const submit = async () => {
    if (await configure(serverUrl)) onComplete()
  }

  return (
    <View style={styles.flex}>
      <TopBar title="Server" onBack={onBack} />
      <Screen>
        <View style={styles.introIcon}><Server size={28} color={colors.primary} /></View>
        <Text style={styles.title}>{config === undefined ? 'Connect your control plane' : 'Remote server'}</Text>
        <Text style={styles.lead}>DSH Remote uses this server for pairing, presence, signaling, and encrypted relay. Your Harness sessions stay on your host.</Text>

        <View style={styles.form}>
          <Field
            label="Server address"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            hint="Use HTTPS outside local development."
            placeholder="https://remote.example.com"
          />
          <Button label={config === undefined ? 'Connect server' : 'Save server'} onPress={() => void submit()} loading={busy} />
        </View>

        <View style={styles.securityNote}>
          <LockKeyhole size={20} color={colors.primary} />
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>Device-to-device trust</Text>
            <Text style={styles.securityBody}>The server routes encrypted frames but does not receive your phone’s private key.</Text>
          </View>
        </View>
      </Screen>
    </View>
  )
}

export function PairDeviceScreen({ initialCode = '', expectedHostFingerprint, onBack, onPaired }: {
  initialCode?: string
  expectedHostFingerprint?: string
  onBack: () => void
  onPaired: (device: RemoteDevice) => void
}) {
  const [code, setCode] = useState(normalizePairingCode(initialCode))
  const pairDevice = useAppStore(state => state.pairDevice)
  const phase = useAppStore(state => state.pairingPhase)
  const message = useAppStore(state => state.pairingMessage)
  const identity = useAppStore(state => state.identity)

  useEffect(() => setCode(normalizePairingCode(initialCode)), [initialCode])

  const submit = async () => {
    const host = await pairDevice(code, expectedHostFingerprint)
    if (host !== undefined) onPaired(host)
  }

  const waiting = phase === 'claiming' || phase === 'waiting'
  return (
    <View style={styles.flex}>
      <TopBar title="Pair device" onBack={onBack} />
      <Screen>
        <View style={styles.introIcon}><Link2 size={28} color={colors.primary} /></View>
        <Text style={styles.title}>Enter the host code</Text>
        <Text style={styles.lead}>Run the Remote plugin on the computer, then enter its one-time 8-character code.</Text>

        <View style={styles.form}>
          <Field
            label="Pairing code"
            value={code}
            onChangeText={value => setCode(normalizePairingCode(value))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            placeholder="82KF-7QMP"
            style={styles.codeInput}
          />
          <Button label={phase === 'waiting' ? 'Waiting for host…' : 'Request pairing'} onPress={() => void submit()} loading={waiting} disabled={code.replace('-', '').length !== 8} />
          {phase === 'complete' && message !== undefined && <SuccessNotice>{message}</SuccessNotice>}
          {phase === 'error' && message !== undefined && <Text accessibilityRole="alert" style={styles.inlineError}>{message}</Text>}
        </View>

        <View style={styles.confirmSteps}>
          <Text style={styles.stepsTitle}>Before access is granted</Text>
          <Step number="1" text="This phone sends its public identity to the server." />
          <Step number="2" text="The host shows this phone and asks for confirmation." />
          <Step number="3" text="Both devices derive an encrypted channel after approval." />
        </View>
        {identity !== undefined && <Text style={styles.deviceHint}>Pairing as {identity.name}</Text>}
      </Screen>
    </View>
  )
}

function Step({ number, text }: { number: string; text: string }) {
  return <View style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><Text style={styles.stepText}>{text}</Text></View>
}

export function SettingsScreen({ onBack, onReset }: { onBack: () => void; onReset: () => void }) {
  const config = useAppStore(state => state.config)
  const identity = useAppStore(state => state.identity)
  const reset = useAppStore(state => state.resetLocalData)

  const confirmReset = () => Alert.alert(
    'Reset DSH Remote?',
    'This removes the server, device identity, and all trusted hosts from this phone. You will need to pair again.',
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
  codeInput: { fontFamily: 'monospace', fontSize: 24, letterSpacing: 3, textAlign: 'center' },
  inlineError: { ...type.small, color: colors.danger, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.sm },
  confirmSteps: { marginTop: spacing.xxxl, gap: spacing.md },
  stepsTitle: { ...type.smallStrong, color: colors.muted, marginBottom: spacing.xxs },
  step: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNumber: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { ...type.caption, color: colors.primary },
  stepText: { ...type.small, color: colors.ink, flex: 1, paddingTop: 2 },
  deviceHint: { ...type.caption, color: colors.subtle, textAlign: 'center', marginTop: spacing.xxl },
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
