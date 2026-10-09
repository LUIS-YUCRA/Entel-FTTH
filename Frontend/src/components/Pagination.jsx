import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Pagination.css';

export default function Pagination({ page, pageSize, total, noun, onPageChange, label = `Paginación de ${noun}` }) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.max(1, Math.min(page, count));
  // Two consecutive pages move with the selection; the last page stays visible.
  const start = Math.max(1, Math.min(current, count - 2));
  const items = count <= 2
    ? Array.from({ length: count }, (_, index) => index + 1)
    : [start, start + 1, 'gap', count];

  return (
    <footer className="system-pagination">
      <span className="system-pagination-summary" aria-live="polite">
        Mostrando {total ? (current - 1) * pageSize + 1 : 0}–{Math.min(current * pageSize, total)} de {total} {noun}
      </span>
      <nav className="system-pagination-nav" aria-label={label}>
        <button type="button" aria-label="Página anterior" disabled={current === 1} onClick={() => onPageChange(current - 1)}><FaChevronLeft aria-hidden="true" /></button>
        {items.map((number) => typeof number === 'number'
          ? <button type="button" key={number} aria-label={`Página ${number}`} aria-current={number === current ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</button>
          : <span className="system-pagination-gap" key={number} aria-hidden="true">…</span>)}
        <button type="button" aria-label="Página siguiente" disabled={current === count} onClick={() => onPageChange(current + 1)}><FaChevronRight aria-hidden="true" /></button>
      </nav>
    </footer>
  );
}
