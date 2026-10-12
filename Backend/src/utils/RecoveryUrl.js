const getRecoveryBaseUrl = () => {
  const production = process.env.NODE_ENV === 'production';
  const fallback = production
    ? 'https://servicioftth.com/reset-password'
    : 'http://localhost:5173/reset-password';
  const candidates = [
    process.env.FRONTEND_RESET_URL,
    process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL.trim().replace(/\/+$/, '')}/reset-password`
      : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate.trim());
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        || url.hostname.endsWith('.localhost');
      if (url.username || url.password || url.search || url.hash) continue;
      if (production ? url.protocol !== 'https:' || local
        : !local || !['http:', 'https:'].includes(url.protocol)) continue;
      if (url.pathname.replace(/\/+$/, '') !== '/reset-password') continue;
      return url.href.replace(/\/+$/, '');
    } catch {
      // Una URL antigua o inválida no debe producir enlaces inutilizables.
    }
  }
  return fallback;
};

module.exports = { getRecoveryBaseUrl };
