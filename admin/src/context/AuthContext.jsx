import { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('folio_admin_token');
    if (!token) { setLoading(false); return; }
    adminApi.me().then((r) => setAdmin(r.admin)).catch(() => localStorage.removeItem('folio_admin_token')).finally(() => setLoading(false));
  }, []);

  const login = (token, adm) => {
    localStorage.setItem('folio_admin_token', token);
    setAdmin(adm);
  };

  const logout = () => {
    localStorage.removeItem('folio_admin_token');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
