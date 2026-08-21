import enUS from './en-US'
import type { Messages } from './types'
import zhCN from './zh-CN'

export type AppLanguage = 'en-US' | 'zh-CN'
export type LanguagePreference = 'system' | AppLanguage

const catalogs: Record<AppLanguage, Messages> = {
  'en-US': enUS,
  'zh-CN': zhCN,
}

let systemLocaleTags = [defaultSystemLocale()]
let preference: LanguagePreference = 'system'
let activeLanguage = resolveLanguage(preference, systemLocaleTags)

/** Live binding used by UI and service code so a language change applies immediately. */
export let strings: Messages = catalogs[activeLanguage]

export function applyLanguagePreference(
  nextPreference: LanguagePreference,
  localeTags: readonly string[] = systemLocaleTags,
): AppLanguage {
  preference = nextPreference
  systemLocaleTags = [...localeTags]
  activeLanguage = resolveLanguage(preference, systemLocaleTags)
  strings = catalogs[activeLanguage]
  return activeLanguage
}

export function updateSystemLocales(localeTags: readonly string[]): AppLanguage {
  systemLocaleTags = [...localeTags]
  if (preference === 'system') {
    activeLanguage = resolveLanguage(preference, systemLocaleTags)
    strings = catalogs[activeLanguage]
  }
  return activeLanguage
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage
}

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || value === 'en-US' || value === 'zh-CN'
}

function resolveLanguage(nextPreference: LanguagePreference, localeTags: readonly string[]): AppLanguage {
  if (nextPreference !== 'system') return nextPreference
  for (const tag of localeTags) {
    const language = tag.toLowerCase().split('-')[0]
    if (language === 'zh') return 'zh-CN'
    if (language === 'en') return 'en-US'
  }
  return 'en-US'
}

function defaultSystemLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return 'en-US'
  }
}
