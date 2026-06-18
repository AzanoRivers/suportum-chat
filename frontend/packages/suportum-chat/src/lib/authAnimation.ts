// Señal de un solo uso: el componente que inicia el cambio de auth
// (login, registro, logout) la activa antes de mutar el store.
// WidgetShell la consume en el useEffect que reacciona al cambio de token.
let _pending = false

export const requestAuthAnimation = (): void => {
  _pending = true
}

export const consumeAuthAnimation = (): boolean => {
  const v = _pending
  _pending = false
  return v
}
