import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authService';
import { getMyProfile } from '../services/profileService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cc_token';
const USER_KEY  = 'cc_user';

export function AuthProvider({ children }) {
  const [user, setUser]                     = useState(null);
  const [token, setToken]                   = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading]               = useState(true); // true while hydrating from localStorage
  const [profilePicture, setProfilePicture] = useState(null);

  /** Fetch the latest profile picture from the server and store it in state. */
  const refreshProfilePicture = useCallback(async () => {
    try {
      const { data } = await getMyProfile();
      setProfilePicture(data?.profile_picture || null);
    } catch {
      // Silently fail — the sidebar will fall back to initials
    }
  }, []);

  // Hydrate session on first mount — validates the stored token against /me
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser  = localStorage.getItem(USER_KEY);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    // Optimistically set user from cache, then verify with server
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (_) {}
    }

    getMe()
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        // Fetch the profile picture after confirming the session is valid
        return getMyProfile();
      })
      .then(({ data }) => {
        setProfilePicture(data?.profile_picture || null);
      })
      .catch(() => {
        // Token invalid / expired — clear everything
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
        setProfilePicture(null);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Called after a successful login response. */
  const loginSuccess = useCallback((accessToken, userData) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    // Fetch the profile picture after login
    getMyProfile()
      .then(({ data }) => setProfilePicture(data?.profile_picture || null))
      .catch(() => setProfilePicture(null));
  }, []);

  /** Clear session and redirect to login. */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setProfilePicture(null);
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user, token, loading, isAuthenticated,
        profilePicture, refreshProfilePicture,
        loginSuccess, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Custom hook to consume auth context. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
