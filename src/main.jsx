import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import InstallPWAPrompt from '@/components/InstallPWAPrompt.jsx'
import { registerPWA } from '@/pwa.js'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <App />
    <InstallPWAPrompt />
  </>
)

registerPWA()
