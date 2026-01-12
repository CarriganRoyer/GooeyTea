import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  name: string;
  email: string;
  isManager: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: () => {},
});

const API = 'http://localhost:8080';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
