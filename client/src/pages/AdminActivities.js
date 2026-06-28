import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AdminActivities() {
  const { user, api, activities, loadActivities, isMobile } = useApp();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', deadline: '', location: '', description: '' });

  useEffect(() => { if (!user) navigate('/admin/login'); }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) return;
    try {
      if (editId) {
        await api.put(`/activities/${editId}`, form);
      } else {
        await api.post('/activities', form);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', date: '', deadline: '', location: '', description: '' });
      loadActivities();
    } catch (e) { alert('操作失败'); }
  };

  const handleEdit = (a) => {
    setForm({ name: a.name, date: a.date, deadline: a.deadline || '', location: a.location || '', description: a.description || '' });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除该活动吗？所有参与记录也将被删除。')) return;
    try {
      await api.delete(`/activities/${id}`);
      loadActivities();
    } catch (e) { alert('删除失败'); }
  };

  if (!user) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 14 : 20, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: isMobile ? 16 : 18 }}>📋 活动管理</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', date: '', deadline: '', location: '', description: '' }); }} style={btnPrimary(isMobile)}>+ 新建活动</button>
      </div>

      {showForm && (
        <div style={{
          background: '#fff', borderRadius: 8, padding: isMobile ? 16 : 24,
          marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>{editId ? '编辑活动' : '新建活动'}</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>活动名称 <span style={{ color: '#d4380d' }}>*</span></label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="例如：2024年6月主题党日活动" />
              </div>
              <div>
                <label style={labelStyle}>活动日期 <span style={{ color: '#d4380d' }}>*</span></label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>活动地点</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="例如：管理学院302会议室" />
              </div>
              <div>
                <label style={labelStyle}>报名截止时间</label>
                <input type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>活动描述</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} placeholder="简要描述活动内容" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={btnPrimary(isMobile)}>{editId ? '保存修改' : '确认创建'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={btnCancel}>取消</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, fontSize: isMobile ? 12 : 14 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontSize: 13, color: '#999' }}>活动名称</th>
              <th style={{ padding: '12px 16px', fontSize: 13, color: '#999' }}>日期</th>
              {!isMobile && <th style={{ padding: '12px 16px', fontSize: 13, color: '#999' }}>报名截止</th>}
              {!isMobile && <th style={{ padding: '12px 16px', fontSize: 13, color: '#999' }}>地点</th>}
              <th style={{ padding: '12px 16px', fontSize: 13, color: '#999' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {activities.map(a => {
              const past = a.deadline && new Date() > new Date(a.deadline);
              return (
              <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
                  <Link to={`/admin/activity/${a.id}`} style={{ color: '#262626', textDecoration: 'none' }}>{a.name}</Link>
                  {isMobile && a.deadline && (
                    <div style={{ fontSize: 11, color: past ? '#ff4d4f' : '#999', marginTop: 2 }}>
                      {a.deadline.replace('T', ' ')} {past && ' (已截止)'}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{a.date}</td>
                {!isMobile && <td style={{ padding: '12px 16px', fontSize: 13, color: past ? '#ff4d4f' : '#666' }}>
                  {a.deadline ? a.deadline.replace('T', ' ') : <span style={{ color: '#ccc' }}>未设置</span>}
                  {past && <span style={{ marginLeft: 6, fontSize: 11, color: '#ff4d4f', background: '#fff1f0', padding: '1px 6px', borderRadius: 3 }}>已截止</span>}
                </td>}
                {!isMobile && <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{a.location || '-'}</td>}
                <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                  <Link to={`/admin/activity/${a.id}`} style={linkStyle}>查看</Link>
                  <button onClick={() => handleEdit(a)} style={linkStyle}>编辑</button>
                  <button onClick={() => handleDelete(a.id)} style={{ ...linkStyle, color: '#ff4d4f' }}>删除</button>
                </td>
              </tr>
            )})}
            {activities.length === 0 && (
              <tr><td colSpan={isMobile ? 3 : 5} style={{ textAlign: 'center', padding: 32, color: '#999' }}>暂无活动，点击上方按钮创建</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btnPrimary = (isMobile) => ({
  padding: isMobile ? '6px 14px' : '8px 20px', background: '#d4380d', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: isMobile ? 12 : 13, fontWeight: 600, whiteSpace: 'nowrap'
});
const btnCancel = { padding: '8px 20px', background: '#fff', color: '#666', border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 13, outline: 'none' };
const linkStyle = { background: 'none', border: 'none', color: '#d4380d', fontSize: 13, cursor: 'pointer', textDecoration: 'none', padding: 0 };