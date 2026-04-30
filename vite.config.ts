import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const root = process.cwd()
  const fileEnv = loadEnv(mode, root, '')
  const pick = (key: string) => String(fileEnv[key] ?? process.env[key] ?? '').trim()

  /** Vercel: usa VITE_* . Si copiaste variables de Next.js, NEXT_PUBLIC_SUPABASE_* también se toma en el build. */
  const rawApi = pick('VITE_API_URL')
  if (process.env.VERCEL === '1' && !rawApi) {
    throw new Error(
      'VITE_API_URL no está definida en Vercel. Settings → Environment Variables → añade VITE_API_URL = https://TU-BACKEND-PUBLICO/api (sin barra final antes de /api) y vuelve a desplegar.',
    )
  }
  const apiUrl = (rawApi || 'http://localhost:3001/api').replace(/\/$/, '')
  const supabaseUrl = pick('VITE_SUPABASE_URL') || pick('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey = pick('VITE_SUPABASE_ANON_KEY') || pick('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    },
  }
})
