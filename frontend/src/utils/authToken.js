const TOKEN_COOKIE_NAME = 'wecupmus_token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 дней

const hasWindow = () => typeof window !== 'undefined';

const readCookieToken = () => {
  if (!hasWindow()) return null;
  const chunks = document.cookie ? document.cookie.split('; ') : [];
  const chunk = chunks.find((item) => item.startsWith(`${TOKEN_COOKIE_NAME}=`));
  if (!chunk) return null;
  const value = chunk.slice(TOKEN_COOKIE_NAME.length + 1);
  return value ? decodeURIComponent(value) : null;
};

const writeCookieToken = (token) => {
  if (!hasWindow()) return;
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Strict`;
};

const clearCookieToken = () => {
  if (!hasWindow()) return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Strict`;
};

export const getAuthToken = () => readCookieToken();

export const setAuthToken = (token) => {
  writeCookieToken(token);
};

export const clearAuthToken = () => {
  clearCookieToken();
};
