import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.PORT || process.env.PORT || '5173')
  return {
    plugins: [react()],
    server: {
      port: isNaN(port) ? 5173 : port,
    }
  }
})
