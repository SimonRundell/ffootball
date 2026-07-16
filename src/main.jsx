import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { loadConfig } from './api.js'

/**
 * Loads /.config.json before the app renders, since the shared axios
 * instance and everything that reads `config.apiBaseUrl` (the sandbox
 * output frame, the API explorer) depend on it being ready first.
 */
async function bootstrap() {
  const root = createRoot(document.getElementById('root'))

  try {
    await loadConfig()
  } catch (err) {
    root.render(
      <p className="loading-notice">
        Could not load configuration: {err.message}
      </p>,
    )
    return
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
