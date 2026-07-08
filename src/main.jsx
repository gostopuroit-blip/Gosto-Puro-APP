import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { registerPWA } from '@/pwa.js'
import '@/index.css'

// O convite de instalação agora é o InstallNudge (global, dentro do Layout,
// só p/ usuário logado e coordenado com o de notificação).
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

registerPWA()
