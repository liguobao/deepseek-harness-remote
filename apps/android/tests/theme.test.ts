import { describe, expect, it } from 'vitest'
import { colorsForScheme, darkColors, lightColors } from '../src/ui/theme'

describe('theme colors', () => {
  it('returns light and dark palettes for each scheme', () => {
    expect(colorsForScheme('light')).toBe(lightColors)
    expect(colorsForScheme('dark')).toBe(darkColors)
  })

  it('defines overlay and shadow tokens in both palettes', () => {
    for (const palette of [lightColors, darkColors]) {
      expect(palette.modalBackdrop).toMatch(/^rgba?\(/)
      expect(palette.menuDismiss).toMatch(/^rgba?\(/)
      expect(palette.shadow.length).toBeGreaterThan(0)
    }
  })
})
