import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadActivities = useCallback(async () => {
    try {
      const { data } = await api.get('/activities');
      setActivities(data);
    } catch (e) { /* ignore */ }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) setUser({ username, token });
    loadActivities();
    loadCategories();
  }, [loadActivities, loadCategories]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    setUser({ username: data.username, token: data.token });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ api, user, login, logout, activities, loadActivities, categories, loadCategories, isMobile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }