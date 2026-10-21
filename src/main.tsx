import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import { bootstrapAuth } from '@/stores/auth'
import { initTheme } from '@/stores/ui'
import { initLanguage } from '@/lib/i18n'

initLanguage()
initTheme()
bootstrapAuth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
