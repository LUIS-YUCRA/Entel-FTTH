import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { networkActivity } from '../../services/NetworkActivity';
import './LoadingScreen.css';

const subscribeConnection = (listener) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};
const isOnline = () => navigator.onLine;

function RouteLoading({ isAuth, isAssistant }) {
  const pending = useSyncExternalStore(networkActivity.subscribe, networkActivity.getSnapshot);
  const online = useSyncExternalStore(subscribeConnection, isOnline);
  const [entering, setEntering] = useState(!isAuth);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 220);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setSlow(true), 450);
    return () => { clearTimeout(timer); setSlow(false); };
  }, [pending]);
  const busy = !isAuth && ((!online && !isAssistant) || entering || (pending > 0 && slow));
  useEffect(() => {
    const content = document.getElementById('route-content');
    if (!content) return;
    content.inert = busy;
    content.setAttribute('aria-busy', String(busy));
    return () => { content.inert = false; };
  }, [busy]);
  return <>
    {busy && <div className="entel-loading" role="status" aria-live="polite" aria-label={online ? 'Cargando página' : 'Esperando conexión'}>
      <div className="entel-loading-center">
        <div className="entel-loading-bars" aria-hidden="true">{[0,1,2,3,4].map((bar) => <i key={bar} style={{ '--bar': bar }} />)}</div>
        <p>{online ? 'Cargando…' : 'Esperando conexión a internet…'}</p>
        {!online && <small>Continuaremos aquí cuando vuelva la conexión.</small>}
      </div>
    </div>}
  </>;
}

export default function LoadingScreen({ children }) {
  const location = useLocation();
  const isAuth = /^\/(login|register|forgot-password|reset-password)(\/|$)/.test(location.pathname);
  // Key only the loading indicator, never the page tree: forms keep their state.
  return <><div id="route-content">{children}</div><RouteLoading key={location.key} isAuth={isAuth} isAssistant={location.pathname === '/dashboard/cliente'} /></>;
}
