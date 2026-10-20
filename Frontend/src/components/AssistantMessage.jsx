// Only render HTTPS citations, without interpreting HTML or arbitrary Markdown.
export default function AssistantMessage({ content }) {
  const text = String(content || '');
  const parts = [];
  const pattern = /\[([^\]\n]{1,160})\]\((https:\/\/[^\s)]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(cursor, match.index));
    let safe = false;
    try { const url = new URL(match[2]); safe = url.protocol === 'https:' && !url.username && !url.password; } catch { /* Keep malformed URLs as text. */ }
    parts.push(safe ? <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a> : match[0]);
    cursor = match.index + match[0].length;
  }
  parts.push(text.slice(cursor));
  return <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{parts}</p>;
}
