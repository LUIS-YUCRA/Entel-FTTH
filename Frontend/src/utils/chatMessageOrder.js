// El identificador de inserción es el orden canónico. Dos mensajes de un
// mismo turno pueden compartir fecha; nunca ordenar por emisor o contenido.
export const orderChatMessages = (messages = []) => {
  const copy = Array.isArray(messages) ? [...messages] : [];
  const entries = copy.map((message, index) => {
    const value = String(message.id ?? '');
    return {message,index,id:/^\d+$/.test(value)?BigInt(value):null};
  });
  // Los mensajes provisionales conservan su lugar hasta confirmarlos.
  if(entries.some(entry=>entry.id===null))return copy;
  return entries.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:a.index-b.index).map(entry=>entry.message);
};
