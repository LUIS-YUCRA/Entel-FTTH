const SESSION_KEYS = ['token', 'refreshToken', 'user', 'lastActivityAt'];

const storage = () => window.sessionStorage;

const migrateLegacySession = () => {
  if (typeof window === 'undefined') return;

  const current = storage();
  if (!current.getItem('token')) {
    SESSION_KEYS.forEach((key) => {
      const legacyValue = window.localStorage.getItem(key);
      if (legacyValue) current.setItem(key, legacyValue);
    });
  }

  SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
};

migrateLegacySession();

export const sessionStore = {
  get: (key) => storage().getItem(key),
  set: (key, value) => storage().setItem(key, value),
  remove: (key) => storage().removeItem(key),
  clear: () => { SESSION_KEYS.forEach((key) => storage().removeItem(key)); window.dispatchEvent(new Event('session-cleared')); },
  getUser: () => {
    try {
      return JSON.parse(storage().getItem('user'));
    } catch {
      return null;
    }
  },
  storeSession: (data) => {
    if (data.token) storage().setItem('token', data.token);
    if (data.refreshToken) storage().setItem('refreshToken', data.refreshToken);
    if (data.user) storage().setItem('user', JSON.stringify(data.user));
  },
};
