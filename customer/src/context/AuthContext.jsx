import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('folio_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await authApi.me();
      setCustomer(res.customer);
    } catch {
      localStorage.removeItem('folio_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = (token, cust) => {
    localStorage.setItem('folio_token', token);
    setCustomer(cust);
  };

  const logout = () => {
    localStorage.removeItem('folio_token');
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ customer, loading, login, logout, isAuthenticated: !!customer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
