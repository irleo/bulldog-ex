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
};

export const apiRequest = async (path, options = {}) => {
  const token = getStoredToken();
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({
    success: false,
    message: 'The server returned an unreadable response.',
  }));

  if (!response.ok) {
    if (response.status === 401) clearStoredToken();
    const error = new Error(payload.message ?? 'The request failed.');
    error.status = response.status;
    error.details = payload.error?.details;
    throw error;
  }

  return payload;
};
