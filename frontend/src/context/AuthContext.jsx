import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token and user info are saved in localStorage
    const savedUser = localStorage.getItem('npc_user');
    const savedToken = localStorage.getItem('npc_token');
    
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse saved user credentials', err);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('npc_user', JSON.stringify(userData));
    localStorage.setItem('npc_token', userData.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('npc_user');
    localStorage.removeItem('npc_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
