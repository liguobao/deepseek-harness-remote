import { useMemo } from 'react'
import { useTheme, type ThemeColors } from './theme-context'

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme()
  return useMemo(() => factory(colors), [colors, factory])
}
