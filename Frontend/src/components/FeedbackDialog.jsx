import { useEffect, useId, useRef, useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import './FeedbackDialog.css';

export default function FeedbackDialog({ title = 'Información', children, onClose, tone, hint }) {
  const dialog = useRef(null);
  const timer = useRef(null);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const contentId = useId();
  const close = () => {
    if (closing) return;
    setClosing(true);
    timer.current = window.setTimeout(() => {
      onClose();
      setClosing(false);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
  };
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => { window.clearTimeout(timer.current); element.close(); };
  }, []);
  const Icon = tone === 'success' ? FaCheckCircle : tone === 'error' || tone === 'warning' ? FaExclamationTriangle : FaInfoCircle;
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={tone ? contentId : undefined} className={`feedback-dialog${tone ? ' feedback-notice' : ''}${closing ? ' is-closing' : ''}`} data-tone={tone} onCancel={(event) => { event.preventDefault(); close(); }}>
    <button type="button" className="feedback-close" aria-label="Cerrar aviso" onClick={close}><FaTimes aria-hidden="true" /></button>
    {tone && <div className="feedback-status-icon"><Icon aria-hidden="true" /></div>}
    <h2 id={titleId}>{title}</h2><div id={contentId} className="feedback-body">{children}</div>
    {hint && <p className="feedback-hint">{hint}</p>}
    {!tone && <button type="button" onClick={close}>Cerrar</button>}
  </dialog>;
}
