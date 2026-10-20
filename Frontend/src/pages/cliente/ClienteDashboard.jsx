import { useEffect, useRef, useState } from 'react';
import {
  FaArrowUp, FaBars, FaCheckCircle, FaComments, FaHeadset, FaImage,
  FaPaperclip, FaPlug, FaRegFileAlt, FaTachometerAlt,
  FaTicketAlt, FaVideo, FaWifi, FaPlus, FaEllipsisH, FaTrash, FaRobot, FaTimes,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/ChatService';
import { dashboardService } from '../../services/DashboardService';
import Footer from '../../components/Footer/Footer';
import Header from '../../components/Header/Header';
import './Dashboard.css';
import DateRangeFilter from '../../components/DateRangeFilter';
import AssistantMessage from '../../components/AssistantMessage';
import ProfileCompletionCard from '../../components/ProfileCompletionCard';

const ClienteDashboard = () => {
  const { user } = useAuth();
  const [range, setRange] = useState({ from: '', to: '' });
  const [summaryError, setSummaryError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const assistantLauncherRef = useRef(null);
  const messageInputRef = useRef(null);
  const assistantCloseRef = useRef(null);
  const closeMobileChat = () => {
    setMobileChatOpen(false);
    assistantLauncherRef.current?.focus();
  };
  useEffect(() => {
    if (!mobileChatOpen) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    if (mobile.matches) assistantCloseRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && mobile.matches) {
        setMobileChatOpen(false);
        assistantLauncherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileChatOpen]);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [creating, setCreating] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const [conversationMenu, setConversationMenu] = useState(null);
  const historyToggleRef = useRef(null);
  const pendingTurn = useRef(null);
  const welcomeLoad = useRef(null);
  const sendLock = useRef(false);
  const conversationRevision = useRef(0);
  const messagesEnd = useRef(null);
  const followMessages = useRef(true);
  useEffect(() => {
    if(followMessages.current)messagesEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, sending]);
  const closeHistory = () => { setHistoryOpen(false); historyToggleRef.current?.focus(); };

  useEffect(() => {
    if (!historyOpen) return;
    const mobile = window.matchMedia('(max-width: 640px)');
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && mobile.matches) {
        setHistoryOpen(false);
        historyToggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [historyOpen]);

  const conversationTitle = (conversation) => {
    const first = conversation.messages?.find((item) => item.sender === 'usuario')?.content;
    return first ? `${first.slice(0, 42)}${first.length > 42 ? '…' : ''}` : 'Nueva conversación';
  };

  const selectConversation = (conversation, preserveDraft = false) => {
    conversationRevision.current += 1;
    followMessages.current = true;
    setCurrentConversation(conversation);
    setMessages(conversation.messages || []);
    setFiles([]);
    if (!preserveDraft) setMessage('');
    setShowMenu(false);
    setError('');
  };

  const refreshConversations = async (preferredId = null) => {
    const { conversations: stored } = await chatService.list();
    setConversations(stored);
    const preferred = stored.find((item) => Number(item.id) === Number(preferredId))
      || stored.find((item) => item.status === 'ACTIVA') || stored[0];
    if (preferred) selectConversation(preferred, true);
    return preferred;
  };

  const startNewConversation = async (parentConversationId = null) => {
    if (sending) return null;
    const { conversation } = await chatService.create(parentConversationId);
    const empty = { ...conversation, messages: conversation.messages || [] };
    setConversations((current) => [empty, ...current]);
    selectConversation(empty);
    return empty;
  };

  const deleteConversation = async (conversation) => {
    setConversationMenu(null);
    if (!window.confirm(`¿Eliminar "${conversationTitle(conversation)}" del historial? Esta acción no eliminará el ticket asociado.`)) return;
    try {
      await chatService.delete(conversation.id);
      const remaining = conversations.filter((item) => Number(item.id) !== Number(conversation.id));
      setConversations(remaining);
      if (Number(currentConversation?.id) === Number(conversation.id)) {
        const next = remaining.find((item) => item.status === 'ACTIVA') || remaining[0];
        if (next) selectConversation(next);
        else {
          setCurrentConversation(null);
          setMessages([]);
        }
      }
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  useEffect(() => {
    let active = true;
    const revision = conversationRevision.current;
    chatService.list()
      .then(async ({ conversations: stored }) => {
        if(!active || revision!==conversationRevision.current || sendLock.current)return;
        setConversations(stored);
        const current = stored.find((item) => item.status === 'ACTIVA');
        if (current?.messages?.length) selectConversation(current, true);
        else {
          welcomeLoad.current ||= chatService.create();
          const { conversation } = await welcomeLoad.current;
          if (!active || revision!==conversationRevision.current || sendLock.current) return;
          setConversations(previous=>[conversation,...previous.filter(item=>item.id!==conversation.id)]);
          selectConversation(conversation,true);
        }
      })
      .catch((loadError) => {if(active && revision===conversationRevision.current)setError(loadError.message);})
      .finally(()=>{if(active)setCreating(false);});
    return () => {active=false;};
  }, []);

  useEffect(() => {
    let active = true;
    dashboardService.clientOverview(range).then((data) => {
      if (active) { setOverview(data); setSummaryError(''); }
    }).catch((requestError) => { if (active) setSummaryError(requestError.message); })
      .finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [range, conversations]);

  const closed = Boolean(currentConversation && (currentConversation.status !== 'ACTIVA' || currentConversation.ticket_id));
  useEffect(() => {
    if (sending || creating || closed) return;
    if (window.matchMedia('(max-width: 760px)').matches && !mobileChatOpen) return;
    messageInputRef.current?.focus({ preventScroll: true });
  }, [sending, creating, closed, mobileChatOpen]);

  const openNewChat = async () => {
    if (sending || creating) return;
    setCreating(true);
    try { await startNewConversation(); } catch (requestError) { setError(requestError.message); }
    finally { setCreating(false); }
  };

  const sendMessage = async (text = message) => {
    const cleanMessage = text.trim();
    if (!cleanMessage || sendLock.current || sending || creating || closed) return;
    sendLock.current = true;
    conversationRevision.current += 1;
    followMessages.current = true;

    setSending(true);
    setError('');
    setMessage('');

    let target = currentConversation;
    try {
      if (!target) target = await startNewConversation();
      if (pendingTurn.current?.message !== cleanMessage || pendingTurn.current?.conversationId !== target.id) {
        const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
        const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
        pendingTurn.current={message:cleanMessage,conversationId:target.id,id:`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`};
      }
      const localId=`local-${pendingTurn.current.id}`;
      setMessages((current) => current.some(item=>item.id===localId)?current:[
        ...current, {id:localId,sender:'usuario',content:cleanMessage},
      ]);
      const response = await chatService.send(cleanMessage, target.id, pendingTurn.current.id);
      pendingTurn.current=null;
      const conversationFinished = response.dialogState === 'FINISHED' || Boolean(response.ticket);
      setCurrentConversation((current) => ({
        ...(current || target), id: response.conversationId,
        status: conversationFinished ? 'FINALIZADA' : 'ACTIVA',
      }));
      setMessages((current) => [
        ...current,
        {
          id: response.messageId || `assistant-${Date.now()}`,
          sender: 'asistente',
          content: response.response,
          metadata: { ticketId: response.ticket?.id || null,profileRequest:response.profileRequest||null },
        },
      ]);

      setSending(false);
      if (files.length) {
        try { await Promise.all(
          files.map((file) => chatService.uploadEvidence(
            file,
            response.conversationId,
            response.ticket?.id,
          )),
        );
        setFiles([]);
        } catch {
          setError('El asistente respondió, pero no se pudieron adjuntar todas las evidencias. Conserva los archivos para enviarlos al soporte.');
          return;
        }
      }
      await refreshConversations(response.conversationId).catch(() => {});
    } catch (error) {
      // Reconcile the stored reply before reporting a lost network response.
      try {
        const { conversations: stored } = await chatService.list();
        const saved = stored.find((item) => Number(item.id) === Number(target?.id));
        const previousId = messages.filter((item) => item.sender === 'asistente').at(-1)?.id;
        const last = saved?.messages?.at(-1);
        if (last?.sender === 'asistente' && last.id !== previousId && saved.messages.length > messages.length) {
          pendingTurn.current=null;setConversations(stored); selectConversation(saved); return;
        }
      } catch { /* Keep the draft available when the connection is unavailable. */ }
      setMessage(cleanMessage);
      setError(error.code === 'ASSISTANT_UNAVAILABLE'
        ? error.message
        : 'No recibimos la respuesta del asistente. Comprueba tu conexión y consulta este chat antes de reenviar el mensaje.');
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const activeTickets = overview
    ? overview.metrics.active
    : '—';


  return (
    <div className="cliente-container">
      <Header />
      <main className="cliente-main">
        <header className="client-page-heading">
          <div>
            <p className="page-eyebrow">Atención digital FTTH</p>
            <h1>Hola, {user?.full_name?.split(' ')[0] || 'cliente'}</h1>
          </div>
          <div className="network-health"><span /> Plataforma conectada</div>
        </header>

        <DateRangeFilter value={range} onChange={(next) => { setSummaryLoading(true); setRange(next); }} description="Resumen según la fecha de creación · incluye el día final" />
        {summaryError && <p className="chat-error" role="alert">{summaryError}</p>}
        {summaryLoading && <p role="status">Actualizando resumen…</p>}
        <section className="client-kpis" aria-label="Resumen de atención">
          <article><FaTicketAlt /><div><strong>{activeTickets}</strong><span>Tickets creados</span></div></article>
          <article><FaCheckCircle /><div><strong>{overview?.metrics.resolved + overview?.metrics.closed || 0}</strong><span>Casos resueltos</span></div></article>
          <article><FaComments /><div><strong>{overview?.conversations.total ?? '—'}</strong><span>Conversaciones</span></div></article>
          <article><FaPaperclip /><div><strong>{overview?.evidences.total ?? '—'}</strong><span>Evidencias enviadas</span></div></article>
        </section>

        <button type="button" ref={assistantLauncherRef} className="mobile-assistant-launcher" aria-label="Abrir chat del asistente inteligente" aria-controls="client-assistant-chat" aria-expanded={mobileChatOpen} onClick={() => setMobileChatOpen(true)}>
          <FaRobot aria-hidden="true" />
        </button>
        <section id="client-assistant-chat" className={`client-assistant-layout${mobileChatOpen ? ' mobile-chat-open' : ''}`} aria-label="Chat del asistente inteligente">
          <div className={`assistant-card ${historyOpen ? 'history-open' : ''}`}>
            <div className="assistant-chat-layout">
              {historyOpen && <button type="button" className="mobile-history-backdrop" onClick={closeHistory} aria-label="Cerrar panel de conversaciones" />}
              <aside id="client-conversation-history" className="conversation-history" aria-label="Historial de conversaciones">
                <div className="conversation-history-heading">
                  <strong>Mis conversaciones</strong>
                  <button type="button" disabled={sending || creating} onClick={openNewChat} aria-label="Nueva conversación"><FaPlus /></button>
                </div>
                <div className="conversation-history-list">
                  {conversations.map((conversation) => (
                    <div key={conversation.id} className={`conversation-history-item${Number(currentConversation?.id) === Number(conversation.id) ? ' active' : ''}`}>
                      <button type="button" className="conversation-select" disabled={sending || creating} onClick={() => { selectConversation(conversation); if (window.matchMedia('(max-width: 640px)').matches) closeHistory(); }}>
                        <span>{conversationTitle(conversation)}</span>
                        <small>{conversation.ticket_code || (conversation.status === 'ACTIVA' ? 'En curso' : 'Finalizada')} · {new Date(conversation.updated_at).toLocaleDateString('es-BO')}</small>
                      </button>
                      <button type="button" className="conversation-options" aria-label={`Opciones de ${conversationTitle(conversation)}`} aria-expanded={Number(conversationMenu) === Number(conversation.id)} onClick={() => setConversationMenu((current) => Number(current) === Number(conversation.id) ? null : conversation.id)}><FaEllipsisH /></button>
                      {Number(conversationMenu) === Number(conversation.id) && <div className="conversation-actions"><button type="button" disabled={sending || creating} onClick={() => deleteConversation(conversation)}><FaTrash /> Eliminar</button></div>}
                    </div>
                  ))}
                  {!conversations.length && <p>Todavía no tienes conversaciones.</p>}
                </div>
              </aside>
              <div className="assistant-chat-main">
            <div className="assistant-card-header">
              <button type="button" className="history-toggle" ref={historyToggleRef} aria-controls="client-conversation-history" onClick={() => setHistoryOpen((current) => !current)} aria-label={historyOpen ? 'Cerrar historial de conversaciones' : 'Abrir historial de conversaciones'} aria-expanded={historyOpen}><FaBars /></button>
              <div className="assistant-identity">
                <div className="assistant-avatar">AI</div>
                <div>
                  <h2>Asistente inteligente FTTH</h2>
                  <p><span /> Disponible ahora</p>
                </div>
              </div>
              <div className="secure-label">Sesión segura</div>
              <button type="button" ref={assistantCloseRef} className="mobile-assistant-close" aria-label="Cerrar chat del asistente" onClick={closeMobileChat}><FaTimes /></button>
            </div>

            <div className="assistant-box">
              <div className="conversation-panel" aria-live="polite" onScroll={(event) => {
                const panel=event.currentTarget;
                followMessages.current=panel.scrollHeight-panel.scrollTop-panel.clientHeight<64;
              }}>
                {messages.length === 0 && (
                  <div className="assistant-empty">
                    <FaHeadset />
                    <h3>¿Qué ocurre con tu servicio?</h3>
                    <p>Puedes escribir el problema o elegir una opción rápida. Te haré preguntas simples para encontrar la causa.</p>

                     <div className="quick-actions-card">
              <div className="side-card-heading">
                <h2>Soluciones rápidas</h2>
                <span>Selecciona el problema</span>
              </div>
              <div className="quick-actions">
                <button type="button" disabled={sending || creating || closed} onClick={() => sendMessage('No tengo internet')}>
                  <FaWifi /><span>Sin internet</span>
                </button>
                <button type="button" disabled={sending || creating || closed} onClick={() => sendMessage('Mi internet está lento')}>
                  <FaTachometerAlt /><span>Internet lento</span>
                </button>
                <button type="button" disabled={sending || creating || closed} onClick={() => sendMessage('Mi módem no enciende')}>
                  <FaPlug /><span>Módem apagado</span>
                </button>
                <button type="button" disabled={sending || creating || closed} onClick={() => sendMessage('El cable de fibra está dañado')}>
                  <span className="warning-icon">!</span><span>Cable dañado</span>
                </button>
              </div>
            </div>
                  </div>
            
            
                )}
                {messages.map((item) => (
                  <div key={item.id} className={`chat-message ${item.sender}`}>
                    <span>{item.sender === 'asistente' ? 'Asistente FTTH' : 'Tú'}</span>
                    {item.sender === 'asistente' ? <AssistantMessage content={item.content} /> : <p>{item.content}</p>}
                    {item.sender==='asistente'&&item.id===messages.at(-1)?.id&&item.metadata?.profileRequest&&!String(user?.[item.metadata.profileRequest]||'').trim()&&!closed&&<ProfileCompletionCard field={item.metadata.profileRequest} disabled={sending} onSaved={field=>sendMessage('Ya completé mi '+({phone:'teléfono',address:'domicilio',zone:'zona',ci:'CI'}[field])+' en el perfil.')} />}

                  </div>
                ))}
                {sending && (
                  <div className="chat-message asistente" role="status" aria-live="polite">
                    <span>Asistente FTTH</span>
                    <p>Estoy revisando tu consulta...</p>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>

              {error && <div className="chat-error" role="alert">{error}</div>}

              {files.length > 0 && (
                <div className="file-list">
                  {files.map((file) => (
                    <div key={`${file.name}-${file.lastModified}`} className="file-item">
                      {file.type.startsWith('image') ? <FaImage /> : <FaVideo />}
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {closed && <div className="chat-closed" role="status"><div><p>Abre un nuevo chat si deseas describir otro problema.</p></div><button type="button" disabled={sending || creating} onClick={openNewChat}>Nuevo chat</button></div>}
              <div className="assistant-input-container">
                <div className="attach-control">
                  <button
                    type="button"
                    className="menu-btn"
                    disabled={sending || creating || closed}
                    onClick={() => setShowMenu((current) => !current)}
                    aria-label="Agregar imágenes o videos"
                    aria-expanded={showMenu}
                  >
                    +
                  </button>
                  <span className="attach-tooltip" role="tooltip">
                    Agregar imágenes o videos
                  </span>
                </div>
                <input
                  type="text"
                  ref={messageInputRef}
                  aria-label="Describe el problema de tu internet"
                  readOnly={sending}
                  aria-busy={sending}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={2000}
                  placeholder={closed ? "" : "Escribe aquí lo que sucede con tu internet..."}
                  disabled={creating || closed}
                />
                <button
                  type="button"
                  className="send-btn"
                  onClick={() => sendMessage()}
                  disabled={sending || creating || closed || !message.trim()}
                  aria-label="Enviar mensaje"
                >
                  <FaArrowUp />
                </button>
              </div>

              {showMenu && (
                <div className="menu-box">
                  <label className="menu-item">
                    <FaPaperclip />
                    <span>Añadir fotos y videos</span>
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*,video/*"
                      onChange={(event) => {
                        const selectedFiles = Array.from(event.target.files);
                        const invalid = selectedFiles.find((file) => (
                          (!file.type.startsWith('image/') && !file.type.startsWith('video/'))
                          || file.size > 10 * 1024 * 1024
                        ));
                        if (invalid) {
                          setError('Solo se permiten imágenes o videos de hasta 10 MB.');
                          return;
                        }
                        setFiles(selectedFiles);
                        setError('');
                        setShowMenu(false);
                      }}
                    />
                  </label>
                  <div className="menu-divider" />
                  <div className="menu-item">
                    <FaRegFileAlt />
                    <span>Máximo 10 MB por archivo</span>
                  </div>
                </div>
              )}
            </div>
          </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ClienteDashboard;
