import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [families, setFamilies] = useState([]); const [selectedFamily, setSelectedFamilyState] = useState(null); const [loading, setLoading] = useState(true);
  const selectFamily = (family) => { setSelectedFamilyState(family); if (family) localStorage.setItem('hearth-family', family._id); else localStorage.removeItem('hearth-family'); };
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me'); setUser(data.user); setFamilies(data.families || []);
      const savedId = localStorage.getItem('hearth-family'); const family = (data.families || []).find((item) => item.familyId?._id === savedId || item._id === savedId) || data.families?.[0];
      if (family) selectFamily(family.familyId || family);
    } catch { setUser(null); setFamilies([]); setSelectedFamilyState(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const value = useMemo(() => ({ user, setUser, families, setFamilies, selectedFamily, selectFamily, loading, refresh }), [user, families, selectedFamily, loading, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
