import { useState } from 'react'
import { SuportumChat } from 'suportum-chat'
import './demo.css'

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8001'
const STORAGE_KEY = 'suportum_api_key'

function readStoredKey(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? '' } catch { return '' }
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    const stored = readStoredKey()
    return stored || ((import.meta as any).env?.VITE_API_KEY ?? '')
  })

  const handleSetupComplete = (key: string) => {
    try { localStorage.setItem(STORAGE_KEY, key) } catch { /* ignore */ }
    setApiKey(key)
  }

  const handleProjectReset = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setApiKey('')
  }

  return (
    <div className="demo-root">
      <div className="demo-center">
        <div className="demo-logo-wrap">
          <img
            src="/azanolabs-logo.png"
            alt="AzanoLabs"
            className="demo-logo"
          />
        </div>
        <p className="demo-hint">Widget de prueba activo</p>
      </div>
      <SuportumChat
        apiUrl={API_URL}
        apiKey={apiKey}
        position="bottom-right"
        buttonLabel="Chat - Suportum"
        locale="en"
        onSetupComplete={handleSetupComplete}
        onProjectReset={handleProjectReset}
      />
    </div>
  )
}
