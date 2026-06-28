import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import ActivityDetail from './pages/ActivityDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminActivities from './pages/AdminActivities';
import AdminActivityDetail from './pages/AdminActivityDetail';
import MemberHistory from './pages/MemberHistory';
import MemberDetail from './pages/MemberDetail';
import AdminSettings from './pages/AdminSettings';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="activity/:id" element={<ActivityDetail />} />
            <Route path="admin/login" element={<AdminLogin />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/activities" element={<AdminActivities />} />
            <Route path="admin/activity/:id" element={<AdminActivityDetail />} />
            <Route path="admin/members" element={<MemberHistory />} />
            <Route path="admin/member/:id" element={<MemberDetail />} />
            <Route path="admin/settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}