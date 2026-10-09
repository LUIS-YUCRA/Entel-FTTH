import { useEffect, useState } from 'react';
import { FaDownload, FaFileVideo, FaImage, FaTimes } from 'react-icons/fa';
import { ticketService } from '../../services/TicketService';
import './EvidenceViewer.css';

const useEvidenceUrl = (evidence) => {
  const [state, setState] = useState({ evidenceId: null, url: '', error: '' });
  useEffect(() => {
    let objectUrl = '';
    if (!evidence) return undefined;
    ticketService.loadEvidence(evidence)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setState({ evidenceId: evidence.id, url: objectUrl, error: '' });
      })
      .catch((requestError) => setState({ evidenceId: evidence.id, url: '', error: requestError.message }));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidence]);
  return state.evidenceId === evidence?.id ? state : { url: '', error: '' };
};

export const EvidenceThumbnail = ({ evidence }) => {
  const { url, error } = useEvidenceUrl(evidence);
  if (error) return <div className="evidence-thumb-placeholder">No se pudo cargar</div>;
  if (!url) return <div className="evidence-thumb-placeholder">Cargando...</div>;
  if (evidence.mime_type.startsWith('image/')) return <img className="evidence-thumbnail" src={url} alt={`Miniatura de ${evidence.original_name}`} />;
  if (evidence.mime_type.startsWith('video/')) return <video className="evidence-thumbnail" src={url} muted preload="metadata" aria-label={`Miniatura de ${evidence.original_name}`} />;
  return <div className="evidence-thumb-placeholder">{evidence.mime_type.startsWith('video/') ? <FaFileVideo /> : <FaImage />}</div>;
};

export const EvidencePreviewModal = ({ evidence, onClose }) => {
  const { url, error } = useEvidenceUrl(evidence);
  if (!evidence) return null;
  return <div className="shared-evidence-overlay" role="dialog" aria-modal="true" aria-label="Vista previa de evidencia">
    <section className="shared-evidence-modal">
      <header><div><span>Evidencia del ticket</span><h2>{evidence.original_name}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar vista previa" title="Cerrar evidencia"><FaTimes /></button></header>
      <div className="shared-evidence-content">
        {!url && !error && <p>Cargando evidencia...</p>}
        {error && <p className="shared-evidence-error">{error}</p>}
        {url && evidence.mime_type.startsWith('image/') && <img src={url} alt={`Evidencia ${evidence.original_name}`} />}
        {url && evidence.mime_type.startsWith('video/') && <video src={url} controls><track kind="captions" /></video>}
      </div>
      <footer><button type="button" className="secondary" onClick={onClose}>Cerrar</button><button type="button" onClick={() => ticketService.downloadEvidence(evidence)}><FaDownload /> Descargar evidencia</button></footer>
    </section>
  </div>;
};
