import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { user, logout, isMobile } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminPage = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'linear-gradient(135deg, #d4380d 0%, #e65b3a 100%)',
        color: '#fff', padding: isMobile ? '0 12px' : '0 32px', height: isMobile ? 48 : 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 24 }}>
          <Link to="/" style={{
            color: '#fff', textDecoration: 'none', fontSize: isMobile ? 15 : 20,
            fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap'
          }}>
            🏛 {isMobile ? '活动管理' : '党员活动管理平台'}
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 16, fontSize: isMobile ? 11 : 14 }}>
          {user ? (
            <>
              {isAdminPage && !isMobile ? (
                <>
                  <NavLink to="/admin">📊 总览</NavLink>
                  <NavLink to="/admin/activities">📋 活动管理</NavLink>
                  <NavLink to="/admin/members">👥 成员统计</NavLink>
                  <NavLink to="/admin/settings">⚙ 设置</NavLink>
                </>
              ) : null}
              <span style={{ fontSize: isMobile ? 11 : 13, opacity: 0.9 }}>👤 {user.username}</span>
              <button onClick={handleLogout} style={{
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff', padding: isMobile ? '4px 10px' : '6px 16px', borderRadius: 4,
                cursor: 'pointer', fontSize: isMobile ? 11 : 13
              }}>退出</button>
            </>
          ) : isAdminPage ? (
            <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: isMobile ? 12 : 14 }}>
              返回首页
            </Link>
          ) : null}
        </div>
      </header>

      {user && isAdminPage && isMobile && (
        <div style={{
          background: '#fff', display: 'flex', gap: 0, borderBottom: '1px solid #f0f0f0',
          overflowX: 'auto', whiteSpace: 'nowrap', flexShrink: 0
        }}>
          <MobileNavLink to="/admin">📊 总览</MobileNavLink>
          <MobileNavLink to="/admin/activities">📋 活动</MobileNavLink>
          <MobileNavLink to="/admin/members">👥 成员</MobileNavLink>
          <MobileNavLink to="/admin/settings">⚙ 设置</MobileNavLink>
        </div>
      )}

      <main style={{
        flex: 1, padding: isMobile ? '16px 12px' : '24px 32px',
        maxWidth: isMobile ? '100%' : 1280, margin: '0 auto', width: '100%'
      }}>
        <Outlet />
      </main>

      <footer style={{
        textAlign: 'center', padding: isMobile ? '12px 0' : '16px 0', color: '#999',
        fontSize: 12, borderTop: '1px solid #e8e8e8', background: '#fafafa'
      }}>
        党员活动管理平台 © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{
      color: '#fff', textDecoration: 'none', fontSize: 14,
      padding: '4px 8px', borderRadius: 4, transition: 'background 0.2s'
    }}>{children}</Link>
  );
}

function MobileNavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
  return (
    <Link to={to} style={{
      flex: 1, textAlign: 'center', padding: '10px 8px', fontSize: 12,
      color: active ? '#d4380d' : '#666', textDecoration: 'none',
      borderBottom: active ? '2px solid #d4380d' : '2px solid transparent',
      fontWeight: active ? 600 : 400
    }}>{children}</Link>
  );
}