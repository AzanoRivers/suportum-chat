// Punto de entrada del paquete suportum-chat
console.log('[suportum-chat] cargando desde SOURCE (alias activo)')
export { SuportumChat } from './templates/FloatingWidget'
export { ThemeProvider, useTheme } from './providers/ThemeProvider'
export { I18nProvider, useI18n } from './i18n'
export type { Locale } from './i18n'
