import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import { DashboardPage } from './pages/DashboardPage'
import { EstudiantesPage } from './pages/EstudiantesPage'
import { CursosPage } from './pages/CursosPage'
import { PagosPage } from './pages/PagosPage'
import { MatriculasPage } from './pages/MatriculasPage'
import { SedesPage } from './pages/SedesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/estudiantes" element={<EstudiantesPage />} />
        <Route path="/cursos" element={<CursosPage />} />
        <Route path="/pagos" element={<PagosPage />} />
        <Route path="/matriculas" element={<MatriculasPage />} />
        <Route path="/sedes" element={<SedesPage />} />
      </Route>
    </Routes>
  )
}
