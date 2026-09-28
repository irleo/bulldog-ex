import { validateBody, validateQuery, InputError } from '../utils/validation.js';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

const tokenKey = 'bulldogsExchangeToken';

export const getStoredToken = () =>
  sessionStorage.getItem(tokenKey) ?? localStorage.getItem(tokenKey);

export const storeToken = (token, remember = false) => {
  sessionStorage.removeItem(tokenKey);
  localStorage.removeItem(tokenKey);
  (remember ? localStorage : sessionStorage).setItem(tokenKey, token);
};

export const clearStoredToken = () => {
  sessionStorage.removeItem(tokenKey);
  localStorage.removeItem(tokenKey);
  window.dispatchEvent(new Event("session-ended"));
};

export const apiRequest = async (path, options = {}) => {
  const query = new URL(path, window.location.origin).searchParams;
  validateQuery(Object.fromEntries(query));
  const token = getStoredToken();
  const isFormData = options.body instanceof FormData;
  if (options.body) {
    if (isFormData) {
      const fields = {};
      for (const [key, value] of options.body) {
        if (value instanceof File) {
          if (value.size && (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type) || value.size > 5 * 1024 * 1024)) throw new InputError('image', 'Choose a JPG, PNG, or WebP image up to 5 MB.');
        } else fields[key] = value;
      }
      const validated = validateBody(path, options.method ?? 'GET', fields, true);
      for (const [key, value] of Object.entries(validated)) options.body.set(key, String(value));
    } else {
      options = { ...options, body: JSON.stringify(validateBody(path, options.method ?? 'GET', JSON.parse(options.body))) };
    }
  }
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    });
  } catch {
    throw new Error('Unable to reach the store. Check your connection and try again.');
  }

  const payload = await response.json().catch(() => ({
    success: false,
    message: 'The server returned an unreadable response.',
  }));

  if (response.ok && payload.success === false) {
    throw new Error('We could not read the store response. Please try again.');
  }

  if (!response.ok) {
    if (response.status === 401 && token && getStoredToken() === token && path !== "/users/login") clearStoredToken();
    const error = new Error(response.status >= 500 ? "We couldn't complete your request. Please try again." : (payload.message ?? 'The request failed.'));
    error.status = response.status;
    error.details = payload.error?.details;
    error.fieldErrors = payload.error?.details;
    throw error;
  }

  return payload;
};
