import { useState, type FormEvent, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { login } from '../services/apiClient'
import { clearSession, getDashboardPathByRole, loadSessionUser, persistSession } from '../state/authSession'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Por favor ingresa email y contraseña.')
      return
    }

    setCargando(true)
    try {
      // Realizar login con el backend
      const data = await login(email.trim(), password.trim())

      persistSession(data.token, data.usuario)
      navigate(getDashboardPathByRole(data.usuario.rol), { replace: true })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg === 'Sesión expirada' ? 'Credenciales inválidas' : errorMsg)
    } finally {
      setCargando(false)
    }
  }

  const forceLogin = new URLSearchParams(location.search).get('force_login') === '1'

  // Si hay sesión guardada, /login redirige al panel; con ?force_login=1 se ignora y se pide usuario de nuevo.
  useEffect(() => {
    if (forceLogin) {
      clearSession()
      navigate('/login', { replace: true })
      return
    }
    const usuario = loadSessionUser()
    if (usuario) {
      navigate(getDashboardPathByRole(usuario.rol), { replace: true })
    }
  }, [forceLogin, navigate])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="grid min-h-screen gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative hidden overflow-hidden rounded-br-[3rem] bg-[#111827] text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_34%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-center p-10">
            <div className="max-w-xl space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.5)]">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#fbbf24]">COLGO</p>
                <h2 className="mt-6 text-3xl font-semibold text-white">Sistema Académico Integral</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/70">
                  Plataforma educativa para administradores, docentes y estudiantes. Gestiona matrículas, calificaciones y reportes.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-white/70">
                <p className="font-semibold text-white">Credenciales de Prueba</p>
                <div className="mt-3 space-y-2 text-xs">
                  <p><span className="font-semibold text-[#fbbf24]">Admin demo:</span></p>
                  <p className="ml-2">Usuario: MARIO</p>
                  <p className="ml-2">Contraseña: 123</p>
                  
                  <p className="mt-3"><span className="font-semibold text-[#fbbf24]">Usuarios nuevos (docente/estudiante):</span></p>
                  <p className="ml-2">Usuario: cédula</p>
                  <p className="ml-2">Contraseña inicial: cédula</p>
                  
                  <p className="mt-3 text-[#fbbf24]">✓ Ingresa con usuario y clave desde este panel</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12">
          <div className="w-full max-w-xl space-y-8 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-10 shadow-soft">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--muted)]">Bienvenido</p>
              <h1 className="text-3xl font-semibold text-[var(--text)]">Inicia sesión</h1>
              <p className="text-sm text-[var(--muted)]">
                Correo, usuario o <strong>cédula</strong> (docente/estudiante) y contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--muted)]">Correo, usuario o cédula</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@colgo.edu o número de cédula"
                  type="text"
                  disabled={cargando}
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--muted)]">Contraseña</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  disabled={cargando}
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
                />
              </label>

              <Button 
                type="submit" 
                className="w-full" 
                variant="primary"
                disabled={cargando}
              >
                {cargando ? 'Iniciando sesión...' : 'Ingresar al sistema'}
              </Button>
            </form>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-xs text-[var(--muted)]">
              <p>
                <strong>Conecta con backend:</strong>{' '}
                {import.meta.env.DEV ? (
                  <>en local ejecuta <code className="text-[var(--text)]">npm run server</code> (puerto 3001).</>
                ) : import.meta.env.VITE_API_URL ? (
                  <>
                    API: <code className="break-all text-[var(--text)]">{String(import.meta.env.VITE_API_URL)}</code>
                    {String(import.meta.env.VITE_API_URL).includes('localhost') ? (
                      <span className="mt-2 block font-medium text-red-700">
                        Este build apunta a localhost: en Vercel → Environment Variables añade{' '}
                        <code className="text-[var(--text)]">VITE_API_URL</code> con la URL HTTPS de tu API (ej. Railway) y
                        redespliega.
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>en Vercel define <code className="text-[var(--text)]">VITE_API_URL</code> con la URL pública de tu API y vuelve a desplegar.</>
                )}
              </p>
            </div>
            {import.meta.env.PROD &&
            String(import.meta.env.VITE_API_URL || '').includes('localhost') ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                El login falla porque el sitio intenta llamar a <strong>localhost</strong> desde internet. Configura{' '}
                <code className="rounded bg-red-100 px-1">VITE_API_URL</code> en Vercel y en el backend{' '}
                <code className="rounded bg-red-100 px-1">CORS_ORIGIN</code> con la URL exacta de este sitio (ej. tu <code className="break-all">*.vercel.app</code>).
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
