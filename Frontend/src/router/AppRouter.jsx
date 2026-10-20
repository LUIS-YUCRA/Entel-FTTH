import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoadingScreen from '../components/Navigation/LoadingScreen';
import AuthLayout from '../layouts/AuthLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import ClienteDashboard from '../pages/cliente/ClienteDashboard';
import Tickets from '../pages/cliente/Tickets';
import PerfilCliente from '../pages/cliente/PerfilCliente';
import OperadorDashboard from '../pages/operador/OperadorDashboard';
import PerfilOperador from '../pages/operador/PerfilOperador';
import TecnicoDisponible from '../pages/operador/TecnicoDisponible';
import TicketsOperador from '../pages/operador/TicketsOperador';
import MisTickets from '../pages/tecnico/MisTickets';
import HistorialTecnico from '../pages/tecnico/HistorialTecnico';
import PerfilTecnico from '../pages/tecnico/PerfilTecnico';
import AdminDashboard from '../pages/admin/AdminDashboard';
import Reportes from '../pages/admin/Reportes';
import GestionUsuarios from '../pages/admin/GestionUsuarios';
import InstanciasServicio from '../pages/admin/InstanciasServicio';
import PerfilAdmin from '../pages/admin/PerfilAdmin';
import Notifications from '../pages/Notifications';

const secure = (component, roles) => (
  <ProtectedRoute roles={roles}>{component}</ProtectedRoute>
);

const AppRouter = () => (
  <BrowserRouter>
    <LoadingScreen>
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/dashboard/cliente" element={secure(<ClienteDashboard />, ['cliente'])} />
      <Route path="/Tickets" element={secure(<Tickets />, ['cliente'])} />
      <Route path="/PerfilCliente" element={secure(<PerfilCliente />, ['cliente'])} />

      <Route path="/dashboard/operador" element={secure(<OperadorDashboard />, ['operador'])} />
      <Route path="/TicketsOperador" element={secure(<TicketsOperador />, ['operador'])} />
      <Route path="/PerfilOperador" element={secure(<PerfilOperador />, ['operador'])} />
      <Route path="/TecnicoDisponible" element={secure(<TecnicoDisponible />, ['operador'])} />

      <Route path="/dashboard/tecnico" element={secure(<PerfilTecnico />, ['tecnico'])} />
      <Route path="/MisTickets" element={secure(<MisTickets />, ['tecnico'])} />
      <Route path="/HistorialTecnico" element={secure(<HistorialTecnico />, ['tecnico'])} />
      <Route path="/PerfilTecnico" element={secure(<Navigate to="/dashboard/tecnico" replace />, ['tecnico'])} />

      <Route path="/dashboard/administrador" element={secure(<AdminDashboard />, ['administrador'])} />
      <Route path="/GestionTecnicos" element={secure(<TecnicoDisponible />, ['administrador'])} />
      <Route path="/Reportes" element={secure(<Reportes />, ['administrador'])} />
      <Route path="/GestionUsuarios" element={secure(<GestionUsuarios />, ['administrador'])} />
      <Route path="/InstanciasServicio" element={secure(<InstanciasServicio />, ['administrador'])} />
      <Route path="/ConocimientoAsistente" element={secure(<Navigate to="/dashboard/administrador" replace />, ['administrador'])} />
      <Route path="/PerfilAdmin" element={secure(<PerfilAdmin />, ['administrador'])} />
      <Route path="/notificaciones" element={secure(<Notifications />, ['cliente', 'operador', 'tecnico'])} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </LoadingScreen>
  </BrowserRouter>
);

export default AppRouter;
