import { useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Bot } from 'lucide-react-native'
import { ChatScreen } from './src/screens/chat-screen'
import { DeviceDetailScreen, DevicesScreen, SessionsScreen } from './src/screens/device-screens'
import { ServerSetupScreen, SettingsScreen } from './src/screens/setup-screens'
import { WorkspacesScreen } from './src/screens/workspaces-screen'
import { useAppStore } from './src/state/store'
import { Button, ErrorBanner } from './src/ui/components'
import { colors, radius, spacing, type } from './src/ui/theme'

type Route =
  | { name: 'server' }
  | { name: 'devices' }
  | { name: 'device'; deviceId: string }
  | { name: 'workspaces' }
  | { name: 'sessions' }
  | { name: 'chat' }
  | { name: 'settings' }

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function AppNavigator() {
  const bootPhase = useAppStore(state => state.bootPhase)
  const config = useAppStore(state => state.config)
  const devices = useAppStore(state => state.devices)
  const selectedDevice = useAppStore(state => state.selectedDevice)
  const error = useAppStore(state => state.error)
  const bootstrap = useAppStore(state => state.bootstrap)
  const reconnect = useAppStore(state => state.reconnect)
  const setOffline = useAppStore(state => state.setOffline)
  const clearError = useAppStore(state => state.clearError)
  const [routes, setRoutes] = useState<Route[]>([{ name: 'server' }])
  const didChooseInitialRoute = useRef(false)
  const route = routes[routes.length - 1]!

  const push = (next: Route) => setRoutes(current => [...current, next])
  const replace = (next: Route) => setRoutes(current => [...current.slice(0, -1), next])
  const pop = () => setRoutes(current => current.length > 1 ? current.slice(0, -1) : current)
  const reset = (next: Route) => setRoutes([next])

  useEffect(() => { void bootstrap() }, [bootstrap])

  useEffect(() => {
    if (bootPhase !== 'ready' || didChooseInitialRoute.current) return
    didChooseInitialRoute.current = true
    reset(config === undefined ? { name: 'server' } : { name: 'devices' })
  }, [bootPhase, config])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (routes.length <= 1) return false
      pop()
      return true
    })
    return () => subscription.remove()
  }, [routes.length])

  useEffect(() => NetInfo.addEventListener(state => {
    if (state.isConnected === false) setOffline()
    else if (useAppStore.getState().connection.phase === 'offline' && useAppStore.getState().selectedDevice !== undefined) void reconnect()
  }), [reconnect, setOffline])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && useAppStore.getState().connection.phase === 'offline') void reconnect()
    })
    return () => subscription.remove()
  }, [reconnect])

  if (bootPhase === 'loading') return <LoadingScreen />
  if (bootPhase === 'error') return <BootError onRetry={() => void bootstrap()} message={error} />

  const deviceForRoute = route.name === 'device'
    ? devices.find(device => device.deviceId === route.deviceId) ?? selectedDevice
    : undefined

  return (
    <View style={styles.flex}>
      {error !== undefined && <ErrorBanner message={error} onDismiss={clearError} />}
      {route.name === 'server' && <ServerSetupScreen onBack={routes.length > 1 ? pop : undefined} onComplete={() => reset({ name: 'devices' })} />}
      {route.name === 'devices' && <DevicesScreen onDevice={device => push({ name: 'device', deviceId: device.deviceId })} onSettings={() => push({ name: 'settings' })} />}
      {route.name === 'device' && deviceForRoute !== undefined && <DeviceDetailScreen device={deviceForRoute} onBack={pop} onSessions={() => push({ name: 'sessions' })} onWorkspaces={() => push({ name: 'workspaces' })} onForgotten={() => reset({ name: 'devices' })} />}
      {route.name === 'device' && deviceForRoute === undefined && <MissingRoute onBack={() => reset({ name: 'devices' })} />}
      {route.name === 'workspaces' && <WorkspacesScreen onBack={pop} onSessions={() => push({ name: 'sessions' })} />}
      {route.name === 'sessions' && <SessionsScreen onBack={pop} onSession={() => push({ name: 'chat' })} />}
      {route.name === 'chat' && <ChatScreen onBack={pop} />}
      {route.name === 'settings' && <SettingsScreen onBack={pop} onReset={() => reset({ name: 'server' })} />}
    </View>
  )
}

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <View style={styles.logo}><Bot size={27} color={colors.primary} /></View>
      <Text style={styles.loadingTitle}>DSH Remote</Text>
      <Text style={styles.loadingBody}>Loading secure device identity…</Text>
    </View>
  )
}

function BootError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.loadingTitle}>Couldn’t start DSH Remote</Text>
      <Text style={styles.loadingBody}>{message ?? 'Secure storage is unavailable.'}</Text>
      <View style={styles.retry}><Button label="Try again" onPress={onRetry} /></View>
    </View>
  )
}

function MissingRoute({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.loadingTitle}>Device unavailable</Text>
      <Text style={styles.loadingBody}>This device is no longer in the trusted device list.</Text>
      <View style={styles.retry}><Button label="Back to devices" onPress={onBack} /></View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, backgroundColor: colors.background },
  logo: { width: 58, height: 58, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  loadingTitle: { ...type.title, color: colors.ink, textAlign: 'center' },
  loadingBody: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: spacing.xs },
  retry: { alignSelf: 'stretch', marginTop: spacing.xl },
})
