import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/AuthService';
import { sessionStore } from '../services/SessionStore';
import { hasIdleLimit, isIdleExpired, watchIdleSession } from '../services/IdleSession';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      if (!sessionStore.get('token')) { setLoading(false); return; }
      const stored = sessionStore.getUser();
      if (hasIdleLimit(stored?.user_type) && isIdleExpired(sessionStore.get('lastActivityAt'))) {
        void authService.logout(); setLoading(false); return;
      }
      try {
        const data = await authService.profile();
        if (active && sessionStore.get('token')) {
          setUser(data.user);
          sessionStore.set('user', JSON.stringify(data.user));
        }
      } catch (error) {
        if (active && sessionStore.get('token')) setRestoreError(error.message);
      } finally { if (active) setLoading(false); }
    };
    restoreSession();
    return () => { active = false; };
  }, [restoreAttempt]);

  useEffect(() => {
    const cleared = () => { setUser(null); setRestoreError(''); };
    window.addEventListener('session-cleared', cleared);
    return () => window.removeEventListener('session-cleared', cleared);
  }, []);

  useEffect(() => {
    if (!hasIdleLimit(user?.user_type)) return;
    return watchIdleSession({
      readLastActivity: () => sessionStore.get('lastActivityAt'),
      writeLastActivity: (time) => sessionStore.set('lastActivityAt', String(time)),
      onExpire: () => { setUser(null); void authService.logout(); },
      onActivity: () => { void authService.activity().catch(() => {}); },
    });
  }, [user?.user_type]);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    return response;
  };

  const register = (userData) => authService.register(userData);

  const updateProfile = async (profile) => {
    const response = await authService.updateProfile(profile);
    setUser(response.user);
    sessionStore.set('user', JSON.stringify(response.user));
    return response;
  };

  const uploadProfilePhoto = async (file) => {
    const response = await authService.uploadProfilePhoto(file);
    setUser(response.user);
    sessionStore.set('user', JSON.stringify(response.user));
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  if (restoreError) return <div className="route-loading" role="alert"><p>No se pudo validar tu sesión. {restoreError}</p><button type="button" onClick={() => { setRestoreError(''); setLoading(true); setRestoreAttempt(value => value + 1); }}>Reintentar</button></div>;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      updateProfile,
      uploadProfilePhoto,
      logout,
      isAuthenticated: Boolean(user && authService.getToken()),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
