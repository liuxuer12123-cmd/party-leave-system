import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AdminSettings() {
  const { user, api, isMobile } = useApp();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { if (!user) navigate('/admin/login'); }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) return setError('两次输入的新密码不一致');
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setMessage('密码修改成功！');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || '修改失败');
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontSize: isMobile ? 16 : 18, marginBottom: isMobile ? 14 : 20 }}>⚙ 管理设置</h2>

      <div style={{
        background: '#fff', borderRadius: 8, padding: isMobile ? 16 : 24,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20
      }}>
        <h3 style={{ fontSize: isMobile ? 14 : 15, marginBottom: 16 }}>修改密码</h3>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>原密码</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>新密码</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>确认新密码</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
          </div>
          {error && <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '8px 12px', marginBottom: 12, color: '#cf1322', fontSize: 13 }}>{error}</div>}
          {message && <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, padding: '8px 12px', marginBottom: 12, color: '#389e0d', fontSize: 13 }}>{message}</div>}
          <button type="submit" style={{
            width: '100%', padding: '10px 0', background: '#d4380d', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>确认修改</button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 13, outline: 'none' };