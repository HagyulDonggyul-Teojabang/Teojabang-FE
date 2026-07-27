import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { geminiAnalyzePlugin } from './vite-gemini-plugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), geminiAnalyzePlugin(env)],
  }
})
