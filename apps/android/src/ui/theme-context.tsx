import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { colorsForScheme, type ColorScheme, type ThemeColors } from './theme'

export interface Theme {
  colors: ThemeColors
  scheme: ColorScheme
}

const ThemeContext = createContext<Theme>({
  colors: colorsForScheme('light'),
  scheme: 'light',
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const scheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light'
  const value = useMemo<Theme>(() => ({
    colors: colorsForScheme(scheme),
    scheme,
  }), [scheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}

export type { ThemeColors } from './theme'
