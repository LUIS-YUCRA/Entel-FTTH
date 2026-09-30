import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// eslint-disable-next-line react-refresh/only-export-components
export const dashboardFor = (role) => `/dashboard/${role}`;

const ProtectedRoute = ({ roles, children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="route-loading">Validando sesión...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.user_type)) {
    return <Navigate to={dashboardFor(user.user_type)} replace />;
  }
  return children;
};

export default ProtectedRoute;
