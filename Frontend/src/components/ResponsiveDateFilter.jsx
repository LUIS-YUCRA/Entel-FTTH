import { useEffect, useRef, useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

const dateValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export default function ResponsiveDateFilter({ value, onChange }) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [month, setMonth] = useState(() => new Date());
  const panel = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  if (!mobile) return <div className="technician-date"><FaCalendarAlt /><input aria-label="Fecha" type="date" value={value} onChange={event => onChange(event.target.value)} /></div>;
  const year = month.getFullYear();
  const index = month.getMonth();
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  const days = new Date(year, index + 1, 0).getDate();
  const choose = next => { onChange(next); panel.current.open = false; panel.current.querySelector('summary').focus(); };
  return <details className="mobile-date-filter" ref={panel} onToggle={event => {
    if (event.currentTarget.open) setMonth(value ? new Date(`${value}T12:00:00`) : new Date());
  }} onKeyDown={event => { if (event.key === 'Escape') { panel.current.open = false; panel.current.querySelector('summary').focus(); } }}>
    <summary><FaCalendarAlt aria-hidden="true" />{value ? value.split('-').reverse().join('/') : 'Seleccionar fecha'}</summary>
    <div className="mobile-date-calendar">
      <div className="mobile-date-month"><button type="button" aria-label="Mes anterior" onClick={() => setMonth(new Date(year, index - 1, 1))}>‹</button><strong aria-live="polite">{month.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Mes siguiente" onClick={() => setMonth(new Date(year, index + 1, 1))}>›</button></div>
      <div className="mobile-date-days">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <span key={day}>{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(year, index, i + 1); const key = dateValue(date);
          return <button key={key} type="button" aria-label={date.toLocaleDateString('es-BO', { dateStyle: 'full' })} aria-pressed={value === key} onClick={() => choose(key)}>{i + 1}</button>;
        })}
      </div>
      <div className="mobile-date-actions"><button type="button" onClick={() => choose('')}>Borrar</button><button type="button" onClick={() => choose(dateValue(new Date()))}>Hoy</button></div>
    </div>
  </details>;
}
