import Pagination from '../components/Pagination';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaBell,
  FaChartLine,
  FaCheck,
  FaExclamationCircle,
  FaPaperPlane,
  FaSyncAlt,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer/Footer';
import RoleSidebar from '../components/Navigation/RoleSidebar';
import { notificationService } from '../services/NotificationService';
import './Notifications.css';
import DateRangeFilter from '../components/DateRangeFilter';

const roleNames = {
  cliente: 'Cliente',
  operador: 'Operador',
  tecnico: 'Técnico',
};

const emailStatusLabel = {
  ENVIADA: 'Correo enviado',
  FALLIDA: 'Correo fallido',
  NO_CONFIGURADO: 'Solo plataforma',
  OMITIDA_QA: 'Solo plataforma',
};

const isToday = (date) => {
  const value = new Date(date);
  const today = new Date();
  return value.getFullYear() === today.getFullYear()
    && value.getMonth() === today.getMonth()
    && value.getDate() === today.getDate();
};

const Notifications = () => {
  const { user } = useAuth();
  const [range, setRange] = useState({ from: '', to: '' });
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await notificationService.list(range);
      setItems(data.notifications || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    let active = true;
    notificationService.list(range)
      .then((data) => {
        if (active) setItems(data.notifications || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadNotifications(true);
    }, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loadNotifications, range]);

  const metrics = useMemo(() => {
    const unread = items.filter((item) => !item.read_at).length;
    const sent = items.filter((item) => item.email_status === 'ENVIADA');
    const failed = items.filter((item) => item.email_status === 'FALLIDA').length;
    const attempted = sent.length + failed;

    return {
      unread,
      sentToday: sent.filter((item) => isToday(item.created_at)).length,
      failed,
      deliveryRate: attempted ? ((sent.length / attempted) * 100).toFixed(1) : '—',
    };
  }, [items]);

  const visible = useMemo(() => items.filter((item) => {
    if (filter === 'unread') return !item.read_at;
    if (filter === 'sent') return item.email_status === 'ENVIADA';
    if (filter === 'failed') return item.email_status === 'FALLIDA';
    return true;
  }), [items, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / 5));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visible.slice((currentPage - 1) * 5, currentPage * 5);

  const read = async (item) => {
    if (item.read_at) return;
    setError('');
    try {
      const data = await notificationService.read(item.id);
      setItems((current) => current.map((entry) => (
        entry.id === item.id ? { ...entry, ...data.notification } : entry
      )));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const readAll = async () => {
    setUpdating(true);
    setError('');
    try {
      await notificationService.readAll();
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="notifications-shell">
      <RoleSidebar role={user.user_type} />
      <main className="notifications-main">
        <div className="notifications-content">
          <header className="notifications-heading">
            <div>
              <span>Vista centralizada · {roleNames[user.user_type]}</span>
              <h1>Centro de notificaciones</h1>
              <p>Todos los eventos de tu cuenta en un solo lugar.</p>
            </div>
            <div className="notification-actions">
              <button
                className="notification-refresh"
                type="button"
                onClick={() => loadNotifications()}
                disabled={loading}
                aria-label="Actualizar notificaciones"
              >
                <FaSyncAlt className={loading ? 'spinning' : ''} /> Actualizar
              </button>
              <button
                className="notification-read-all"
                type="button"
                onClick={readAll}
                disabled={!metrics.unread || updating}
              >
                <FaCheck /> {updating ? 'Actualizando...' : 'Marcar todas como leídas'}
              </button>
            </div>
          </header>

          {error && (
            <div className="notification-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => loadNotifications()}>Reintentar</button>
            </div>
          )}

          {user.user_type === 'cliente' && <DateRangeFilter value={range} onChange={(next) => { setLoading(true); setPage(1); setRange(next); }} description="Se conservan las notificaciones de los últimos 3 meses" />}
          <section className={`notification-stats${['cliente', 'tecnico', 'operador'].includes(user.user_type) ? ' client-notification-stats' : ''}`} aria-label="Resumen de notificaciones">
            <article className="pending">
              <span className="stat-icon"><FaBell /></span>
              <div><strong>{metrics.unread}</strong><span>Pendientes</span></div>
            </article>
            <article className="sent">
              <span className="stat-icon"><FaPaperPlane /></span>
              <div><strong>{metrics.sentToday}</strong><span>Enviadas hoy</span></div>
            </article>
            <article className="failed">
              <span className="stat-icon"><FaExclamationCircle /></span>
              <div><strong>{metrics.failed}</strong><span>Fallidas</span></div>
            </article>
            <article className="rate">
              <span className="stat-icon"><FaChartLine /></span>
              <div><strong>{metrics.deliveryRate}{metrics.deliveryRate !== '—' && '%'}</strong><span>Tasa de entrega</span></div>
            </article>
          </section>

          <section className="notification-panel">
            <div className="notification-tabs" role="tablist" aria-label="Filtrar notificaciones">
              {[
                ['all', 'Todas'],
                ['unread', 'No leídas'],
                ['sent', 'Enviadas'],
                ['failed', 'Fallidas'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  className={filter === value ? 'active' : ''}
                  onClick={() => { setFilter(value); setPage(1); }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="notification-list" aria-live="polite">
              {loading && <p className="empty-notifications">Cargando notificaciones...</p>}
              {!loading && pageItems.map((item) => (
                <button
                  type="button"
                  className={`notification-row${item.read_at ? '' : ' unread'}`}
                  key={item.id}
                  onClick={() => read(item)}
                  aria-label={`${item.title}. ${item.read_at ? 'Leída' : 'Nueva'}`}
                >
                  <span className="notification-icon"><FaBell /></span>
                  <span className="notification-copy">
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                    <small>
                      {new Date(item.created_at).toLocaleString('es-BO')}
                      {item.ticket_code && ` · ${item.ticket_code}`}
                    </small>
                  </span>
                  <span className="notification-statuses">
                    <span className={`notification-state${item.read_at ? ' read' : ''}`}>
                      {item.read_at ? 'Leída' : 'Nueva'}
                    </span>
                    <small className={`delivery-state ${item.email_status?.toLowerCase() || 'platform'}`}>
                      {emailStatusLabel[item.email_status] || 'Plataforma'}
                    </small>
                  </span>
                </button>
              ))}
              {!loading && !visible.length && (
                <p className="empty-notifications">No hay notificaciones en esta categoría.</p>
              )}
            </div>
          {!loading && visible.length > 0 && (
            <Pagination page={currentPage} pageSize={5} total={visible.length} noun="notificaciones" onPageChange={setPage} />
          )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
