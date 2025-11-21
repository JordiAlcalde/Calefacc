import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega les variables d'entorn (incloent la API_KEY de Vercel)
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Això permet que el codi 'process.env.API_KEY' funcioni al navegador
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})