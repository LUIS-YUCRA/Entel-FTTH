import { useState } from 'react';
import { presetRange } from '../utils/dateRange';
import './DateRangeFilter.css';

export default function DateRangeFilter({ value, onChange, description = 'Filtra por fecha de creación' }) {
  const [draft, setDraft] = useState(value);
  const [period, setPeriod] = useState('all');
  const invalid = draft.from && draft.to && draft.from > draft.to;
  const choose = (key) => { const next = presetRange(key); setPeriod(key); setDraft(next); onChange(next); };
  return <section className="date-range-filter" aria-label="Filtro de fechas" title={description}>
    <div className="date-presets" aria-label="Periodos rápidos">{[['all', 'Todo'], ['day', 'Hoy'], ['week', 'Esta semana'], ['month', 'Este mes']].map(([key, label]) => <button type="button" key={key} aria-pressed={period === key} onClick={() => choose(key)}>{label}</button>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); if (!invalid) { setPeriod('custom'); onChange(draft); } }}>
      <label>Fecha inicio<input type="date" value={draft.from} max={draft.to || undefined} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label>
      <label>Fecha fin<input type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
      <button type="submit" disabled={Boolean(invalid)}>Aplicar filtro</button>
    </form>
    {invalid && <p role="alert">La fecha de inicio debe ser anterior o igual a la fecha fin.</p>}
  </section>;
}
