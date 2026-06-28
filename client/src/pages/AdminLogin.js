import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AdminLogin() {
  const { login, user } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) { navigate('/admin'); return null; }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#262626' }}>🔐 管理员登录</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} placeholder="请输入用户名" autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="请输入密码" />
          </div>
          {error && <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '8px 12px', marginBottom: 16, color: '#cf1322', fontSize: 13 }}>{error}</div>}
          <button disabled={loading} style={{
            width: '100%', padding: '10px 0', background: loading ? '#ccc' : '#d4380d', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
          }}>{loading ? '登录中...' : '登 录'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/" style={{ fontSize: 13, color: '#999', textDecoration: 'none' }}>← 返回首页</Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: 6,
  fontSize: 14, outline: 'none'
};