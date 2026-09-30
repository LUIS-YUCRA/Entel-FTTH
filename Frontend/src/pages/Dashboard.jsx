import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    switch(user.userType) {
      case 'cliente':
        navigate('/dashboard/cliente');
        break;

      case 'operador':
        navigate('/dashboard/operador');
        break;

      case 'tecnico':
        navigate('/dashboard/tecnico');
        break;

      case 'admin':
        navigate('/dashboard/admin');
        break;

      default:
        navigate('/login');
    }
  }, [user, navigate]);

  return null;
};

export default Dashboard;