import { useEffect, useRef } from 'react';
import './FeedbackDialog.css';

export default function FeedbackDialog({ title = 'Información', children, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="feedback-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <h2>{title}</h2><div>{children}</div><button type="button" onClick={onClose}>Cerrar</button>
  </dialog>;
}
