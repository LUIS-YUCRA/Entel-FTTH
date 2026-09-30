// Shared request activity. A pending request stays visible until its body is read.
let pending = 0;
const listeners = new Set();
export const networkActivity = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  getSnapshot: () => pending,
  begin() {
    pending += 1;
    listeners.forEach((listener) => listener());
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      pending -= 1;
      listeners.forEach((listener) => listener());
    };
  },
};

export const waitForConnection = (signal) => new Promise((resolve, reject) => {
  const cleanup = () => {
    window.removeEventListener('online', connected);
    signal?.removeEventListener('abort', aborted);
  };
  const connected = () => { cleanup(); resolve(); };
  const aborted = () => { cleanup(); reject(new DOMException('Solicitud cancelada', 'AbortError')); };
  if (signal?.aborted) return aborted();
  if (navigator.onLine) return resolve();
  window.addEventListener('online', connected);
  signal?.addEventListener('abort', aborted, { once: true });
});

// Only reads may be repeated after an uncertain network failure.
export async function fetchWithConnection(url, options = {}) {
  const { timeoutMs = 30000, ...requestOptions } = options;
  delete requestOptions.silent;
  const method = (options.method || 'GET').toUpperCase();
  const read = method === 'GET' || method === 'HEAD';
  for (let attempt = 0; ; attempt += 1) {
    await waitForConnection(options.signal);
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, timeoutMs);
    try {
      const response = await fetch(url, { ...requestOptions, signal: controller.signal });
      // Consume JSON under the same timeout as the response headers.
      const data = await response.json().catch((error) => {
        if (controller.signal.aborted || error instanceof TypeError) throw error;
        return {};
      });
      return { response, data };
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (read && !navigator.onLine) { attempt = -1; continue; }
      if (read && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(read
        ? 'No se pudo conectar con el servidor. Intenta nuevamente en unos momentos.'
        : 'No se pudo confirmar la operación. Verifica el resultado antes de volver a enviarla.', { cause: error });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
    }
  }
}
