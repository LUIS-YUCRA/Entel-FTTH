export const IDLE_TIMEOUT = 120000;
export const hasIdleLimit = (role) => role === 'administrador';
export const isIdleExpired = (lastActivity, now = Date.now()) =>
  !Number.isFinite(Number(lastActivity)) || Number(lastActivity) <= 0 || now - Number(lastActivity) >= IDLE_TIMEOUT;

export function watchIdleSession({ target = window, documentTarget = document, readLastActivity, writeLastActivity, onExpire, onActivity, now = Date.now }) {
  let expired = false;
  let heartbeat;
  const expire = () => { if (!expired) { expired = true; onExpire(); } };
  const check = () => { if (isIdleExpired(readLastActivity(), now())) expire(); };
  const activity = () => {
    check();
    if (expired || documentTarget.visibilityState === 'hidden') return;
    writeLastActivity(now());
    if (!heartbeat) heartbeat = target.setTimeout(() => { heartbeat = null; if (!expired) onActivity(); }, 1000);
  };
  const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => target.addEventListener(event, activity, { passive: true }));
  documentTarget.addEventListener('visibilitychange', check);
  target.addEventListener('focus', check);
  const interval = target.setInterval(check, 1000);
  check();
  return () => {
    target.clearInterval(interval); target.clearTimeout(heartbeat);
    events.forEach(event => target.removeEventListener(event, activity));
    documentTarget.removeEventListener('visibilitychange', check); target.removeEventListener('focus', check);
  };
}
