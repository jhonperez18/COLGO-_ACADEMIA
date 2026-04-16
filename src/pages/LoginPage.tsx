import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { useAuth } from '../state/authContext'

export function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!username.trim() || !password) {
      setError('Por favor ingresa usuario y contraseña.')
      return
    }

    const success = auth.login(username, password)
    if (success) {
      navigate('/dashboard', { replace: true })
      return
    }

    setError('Usuario o contraseña incorrectos.')
  }

  if (auth.authenticated) {
    return <Navigate to="/dashboard" replace />
  }

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
                <h2 className="mt-6 text-3xl font-semibold text-white">Acceso administrativo</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/70">
                  Ingresa con tu usuario y contraseña para administrar estudiantes, matrículas y pagos.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-white/70">
                <p className="font-semibold text-white">Cuenta temporal</p>
                <p className="mt-3">Usuario: <span className="font-semibold text-[#fbbf24]">MARIO</span></p>
                <p>Contraseña: <span className="font-semibold text-[#fbbf24]">123</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12">
          <div className="w-full max-w-xl space-y-8 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-10 shadow-soft">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--muted)]">Bienvenido de nuevo</p>
              <h1 className="text-3xl font-semibold text-[var(--text)]">Accede a la plataforma</h1>
              <p className="text-sm text-[var(--muted)]">Usa las credenciales temporales para iniciar sesión.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--muted)]">Usuario</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="MARIO"
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--muted)]">Contraseña</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="123"
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <Button type="submit" className="w-full" variant="primary">
                Ingresar al sistema
              </Button>
            </form>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-4 text-sm text-[var(--muted)]">
              <p>Al usar estas credenciales temporales, podrás explorar el panel y los datos de prueba.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
