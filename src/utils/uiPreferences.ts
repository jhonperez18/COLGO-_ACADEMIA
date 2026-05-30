export type FontScale = 'sm' | 'md' | 'lg'
export type AccentTone = 'amber' | 'blue' | 'emerald' | 'violet' | 'rose' | 'slate'
export type UiSurface = 'soft' | 'clean' | 'warm' | 'elegant'
export type CornerStyle = 'round' | 'balanced' | 'sharp'
export type ContentWidth = 'standard' | 'wide'
export type TableDensity = 'comfortable' | 'compact'

export type UserInterfaceSettings = {
  compact: boolean
  fontScale: FontScale
  accentTone: AccentTone
  uiSurface: UiSurface
  reduceMotion: boolean
  highContrast: boolean
  cornerStyle: CornerStyle
  contentWidth: ContentWidth
  tableDensity: TableDensity
}

export const DEFAULT_UI_SETTINGS: UserInterfaceSettings = {
  compact: false,
  fontScale: 'md',
  accentTone: 'amber',
  uiSurface: 'soft',
  reduceMotion: false,
  highContrast: false,
  cornerStyle: 'round',
  contentWidth: 'standard',
  tableDensity: 'comfortable',
}

const ACCENT_PALETTE: Record<AccentTone, [string, string]> = {
  amber: ['#fde047', '#facc15'],
  blue: ['#60a5fa', '#3b82f6'],
  emerald: ['#34d399', '#10b981'],
  violet: ['#a78bfa', '#8b5cf6'],
  rose: ['#fb7185', '#f43f5e'],
  slate: ['#94a3b8', '#64748b'],
}

const SURFACE_PALETTE: Record<UiSurface, { bg: string; panel2: string; surface: string }> = {
  soft: { bg: '#f3f4f6', panel2: '#f8fafc', surface: '#ffffff' },
  clean: { bg: '#ffffff', panel2: '#f8fafc', surface: '#ffffff' },
  warm: { bg: '#faf7f2', panel2: '#fefcf8', surface: '#fffefb' },
  elegant: { bg: '#f1f5f9', panel2: '#f8fafc', surface: '#ffffff' },
}

export function parseUiSettings(raw: string | null): UserInterfaceSettings {
  if (!raw) return { ...DEFAULT_UI_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<UserInterfaceSettings>
    return { ...DEFAULT_UI_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_UI_SETTINGS }
  }
}

export function loadUiSettings(userId: string | number | undefined): UserInterfaceSettings {
  const key = `ui_settings_${String(userId ?? 'anon')}`
  return parseUiSettings(localStorage.getItem(key))
}

export function saveUiSettings(userId: string | number | undefined, settings: UserInterfaceSettings): void {
  localStorage.setItem(`ui_settings_${String(userId ?? 'anon')}`, JSON.stringify(settings))
}

export function applyUiSettings(settings: UserInterfaceSettings): void {
  const root = document.documentElement
  const body = document.body

  body.classList.toggle('compact-ui', settings.compact)
  body.classList.toggle('reduce-motion-ui', settings.reduceMotion)
  body.classList.toggle('high-contrast-ui', settings.highContrast)
  body.classList.toggle('table-compact-ui', settings.tableDensity === 'compact')
  body.classList.toggle('content-wide-ui', settings.contentWidth === 'wide')

  body.classList.remove('corner-round-ui', 'corner-balanced-ui', 'corner-sharp-ui')
  body.classList.add(`corner-${settings.cornerStyle}-ui`)

  root.style.fontSize =
    settings.fontScale === 'sm' ? '14px' : settings.fontScale === 'lg' ? '17px' : '16px'

  const [accent, accent2] = ACCENT_PALETTE[settings.accentTone] ?? ACCENT_PALETTE.amber
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-2', accent2)

  const surface = SURFACE_PALETTE[settings.uiSurface] ?? SURFACE_PALETTE.soft
  root.style.setProperty('--bg', surface.bg)
  root.style.setProperty('--panel-2', surface.panel2)
  root.style.setProperty('--surface', surface.surface)
}

export function hydrateUiPreferences(userId: string | number | undefined): UserInterfaceSettings {
  const settings = loadUiSettings(userId)
  applyUiSettings(settings)
  return settings
}
