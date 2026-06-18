import React from 'react'
import ReactDOM from 'react-dom/client'
import './widget.css'
import App from './App'
console.log('[demo] main.tsx ejecutado')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
