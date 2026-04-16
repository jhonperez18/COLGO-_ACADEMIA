import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import { DashboardPage } from './pages/DashboardPage'
import { EstudiantesPage } from './pages/EstudiantesPage'
import { CursosPage } from './pages/CursosPage'
import { PagosPage } from './pages/PagosPage'
import { MatriculasPage } from './pages/MatriculasPage'
import { SedesPage } from './pages/SedesPage'
import { LoginPage } from './pages/LoginPage'
import { useAuth } from './state/authContext'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return auth.authenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/estudiantes" element={<EstudiantesPage />} />
        <Route path="/cursos" element={<CursosPage />} />
        <Route path="/pagos" element={<PagosPage />} />
        <Route path="/matriculas" element={<MatriculasPage />} />
        <Route path="/sedes" element={<SedesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
