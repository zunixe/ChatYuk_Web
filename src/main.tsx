import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import { bootstrapAuth } from '@/stores/auth'
import { initTheme } from '@/stores/ui'

initTheme()
bootstrapAuth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
