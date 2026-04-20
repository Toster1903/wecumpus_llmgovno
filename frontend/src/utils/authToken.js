const TOKEN_STORAGE_KEY = 'token';
const TOKEN_COOKIE_NAME = 'wecupmus_token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const hasWindow = () => typeof window !== 'undefined';

const readCookieToken = () => {
  if (!hasWindow()) {
    return null;
  }

  const chunks = document.cookie ? document.cookie.split('; ') : [];
  const tokenChunk = chunks.find((item) => item.startsWith(`${TOKEN_COOKIE_NAME}=`));
  if (!tokenChunk) {
    return null;
  }

  const value = tokenChunk.slice(TOKEN_COOKIE_NAME.length + 1);
  return value ? decodeURIComponent(value) : null;
};

const writeCookieToken = (token) => {
  if (!hasWindow()) {
    return;
  }

  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
};

const clearCookieToken = () => {
  if (!hasWindow()) {
    return;
  }

  document.cookie = `${TOKEN_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
};

export const getAuthToken = () => {
  if (!hasWindow()) {
    return null;
  }

  const fromStorage = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (fromStorage) {
    return fromStorage;
  }

  const fromCookie = readCookieToken();
  if (fromCookie) {
    localStorage.setItem(TOKEN_STORAGE_KEY, fromCookie);
    return fromCookie;
  }

  return null;
};

export const setAuthToken = (token) => {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  writeCookieToken(token);
};

export const clearAuthToken = () => {
  if (!hasWindow()) {
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  clearCookieToken();
};
