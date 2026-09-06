import { useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  storeToken,
} from "../api/apiClient.js";
import { AuthContext } from "./authContext.js";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    if (!getStoredToken()) return;
    apiRequest("/users/me/session")
      .then((payload) => setUser(payload.data.user))
      .catch(() => clearStoredToken())
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, credentials, remember = false) => {
    const payload = await apiRequest(path, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    storeToken(payload.data.token, remember);
    setUser(payload.data.user);
    return payload.data.user;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login: (credentials, remember) =>
        authenticate("/users/login", credentials, remember),
      register: async (details) => {
        const payload = await apiRequest("/users/register", {
          method: "POST",
          body: JSON.stringify(details),
        });
        return payload.data.user;
      },
      logout: async () => {
        try {
          if (getStoredToken())
            await apiRequest("/users/logout", { method: "POST" });
        } finally {
          clearStoredToken();
          setUser(null);
        }
      },
      refreshUser: async () => {
        const payload = await apiRequest("/users/me/session");
        setUser(payload.data.user);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
