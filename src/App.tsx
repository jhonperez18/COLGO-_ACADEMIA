import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { CursosPage } from "./pages/CursosPage";
import { PagosPage } from "./pages/PagosPage";
import { SedesPage } from "./pages/SedesPage";
import { MatriculasPage } from "./pages/MatriculasPage";
import { EstudianteDashboardPage } from "./pages/EstudianteDashboardPage";
import { DocenteDashboardPage } from "./pages/DocenteDashboardPage";
import UsuariosPage from "./pages/UsuariosPage";
import AdminMiembroPanelPage from "./pages/AdminMiembroPanelPage";
import MiembroFichaLayout from "./layouts/MiembroFichaLayout";
import { ActualizarPasswordPage } from "./pages/ActualizarPasswordPage";
import SupervisionUsuarioPage from "./pages/SupervisionUsuarioPage";
import { StaffDashboardPage } from "./pages/StaffDashboardPage";

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/actualizar-password"
        element={
          <ProtectedRoute>
            <ActualizarPasswordPage />
          </ProtectedRoute>
        }
      />
      <Route path="/unauthorized" element={
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[var(--text)]">403</h1>
            <p className="text-[var(--muted)] mt-2">No tienes permiso para acceder a este recurso</p>
            <a href="/login" className="mt-4 inline-block rounded px-4 py-2 bg-[var(--accent)] text-slate-900 font-medium">
              Volver al login
            </a>
          </div>
        </div>
      } />

      {/* Rutas protegidas - Panel Administrador (lista + módulos con sidebar) */}
      <Route path="/admin" element={<ProtectedRoute rol="admin"><Outlet /></ProtectedRoute>}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="estudiantes" element={<UsuariosPage />} />
          <Route path="docentes" element={<UsuariosPage />} />
          <Route path="estudiantes-gestion" element={<UsuariosPage />} />
          <Route path="staff" element={<UsuariosPage />} />
          <Route path="cursos" element={<CursosPage />} />
          <Route path="pagos" element={<PagosPage />} />
          <Route path="sedes" element={<SedesPage />} />
          <Route path="matriculas" element={<MatriculasPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="supervision" element={<SupervisionUsuarioPage />} />
        </Route>
        {/* Ficha de miembro: interfaz independiente (sin sidebar del panel principal) */}
        <Route path="miembros/:id" element={<MiembroFichaLayout portal="admin" />}>
          <Route index element={<AdminMiembroPanelPage />} />
        </Route>
      </Route>

      {/* Rutas protegidas - Panel Docente */}
      <Route
        path="/docente"
        element={
          <ProtectedRoute rol="docente">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DocenteDashboardPage />} />
        <Route path="dashboard" element={<DocenteDashboardPage />} />
        <Route path="estudiantes" element={<DocenteDashboardPage />} />
        <Route path="notas" element={<DocenteDashboardPage />} />
        <Route path="material" element={<DocenteDashboardPage />} />
        <Route path="perfil" element={<DocenteDashboardPage />} />
      </Route>

      {/* Rutas protegidas - Panel Estudiante */}
      <Route
        path="/estudiante"
        element={
          <ProtectedRoute rol="estudiante">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EstudianteDashboardPage />} />
        <Route path="dashboard" element={<EstudianteDashboardPage />} />
        <Route path="cursos" element={<EstudianteDashboardPage />} />
        <Route path="notas" element={<EstudianteDashboardPage />} />
        <Route path="certificados" element={<EstudianteDashboardPage />} />
        <Route path="perfil" element={<EstudianteDashboardPage />} />
      </Route>

      {/* Rutas protegidas - Panel Staff */}
      <Route path="/staff" element={<ProtectedRoute rol="staff"><Outlet /></ProtectedRoute>}>
        <Route element={<DashboardLayout />}>
          <Route index element={<StaffDashboardPage />} />
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="perfil" element={<StaffDashboardPage />} />
        </Route>
        <Route path="miembros/:id" element={<MiembroFichaLayout portal="staff" />}>
          <Route index element={<AdminMiembroPanelPage />} />
        </Route>
      </Route>

      {/* Compatibilidad con rutas previas */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/student-dashboard" element={<Navigate to="/estudiante/dashboard" replace />} />
      <Route path="/teacher-dashboard" element={<Navigate to="/docente/dashboard" replace />} />
      {/* Raíz: siempre pantalla de credenciales (limpia sesión local vía LoginPage + force_login) */}
      <Route path="/" element={<Navigate to="/login?force_login=1" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;