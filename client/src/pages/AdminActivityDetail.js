import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';

export default function AdminActivityDetail() {
  const { id } = useParams();
  const { user, api, activities, isMobile } = useApp();
  const navigate = useNavigate();
  const activity = activities.find(a => a.id === id);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zipLoading, setZipLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/admin/login'); return; }
    loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const { data } = await api.get(`/activities/${id}/participations`);
      setParticipations(data);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const handleDelete = async (pid) => {
    if (!window.confirm('确定删除这条记录吗？')) return;
    try {
      await api.delete(`/participations/${pid}`);
      loadData();
    } catch (e) { alert('删除失败'); }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/admin/export', { params: { type: 'activity', activity_id: id } });
      const wsData = [['姓名', '学号', '电话', '是否参加', '请假事由', '请假单', '状态']];
      data.rows.forEach(r => {
        wsData.push([r.name, r.student_id, r.phone, r.will_attend ? '参加' : '请假', r.leave_reason || '-', r.leave_file_name || '-', r.status]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '参与名单');
      XLSX.writeFile(wb, `${data.activity.name}-参与名单.xlsx`);
    } catch (e) { alert('导出失败'); }
  };

  const handleDownloadZip = async () => {
    setZipLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/activities/${id}/download-zip`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || '下载失败');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activity.name.replace(/[\\/:*?"<>|]/g, '_')}-请假单.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || '下载失败');
    } finally {
      setZipLoading(false);
    }
  };

  if (!user) return null;
  if (!activity) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>活动不存在</div>;

  const attending = participations.filter(p => p.will_attend === 1 && p.is_absent === 0);
  const onLeave = participations.filter(p => p.will_attend === 0 && p.is_absent === 0);
  const absent = participations.filter(p => p.is_absent === 1);

  const handleDownloadFile = async (filePath, fileName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/files/${filePath}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) { alert('下载失败'); return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleToggleAbsent = async (pid) => {
    try {
      await api.patch(`/participations/${pid}/toggle-absent`);
      loadData();
    } catch (e) { alert('操作失败'); }
  };

  const cardStyle = isMobile
    ? { fontSize: 16, fontWeight: 700 }
    : { fontSize: 24, fontWeight: 700 };

  return (
    <div>
      <Link to="/admin/activities" style={{ color: '#d4380d', fontSize: 13, textDecoration: 'none' }}>← 返回活动管理</Link>

      <div style={{
        marginTop: 16, background: '#fff', borderRadius: 8,
        padding: isMobile ? 14 : 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: isMobile ? 16 : 20, marginBottom: 4 }}>{activity.name}</h2>
            <p style={{ fontSize: 13, color: '#999' }}>📅 {activity.date} {activity.location ? `| 📍 ${activity.location}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={handleExport} style={{
              padding: isMobile ? '6px 12px' : '8px 20px', background: '#52c41a', color: '#fff', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontSize: isMobile ? 11 : 13, fontWeight: 600, whiteSpace: 'nowrap'
            }}>📥 导出 Excel</button>
            <button onClick={handleDownloadZip} disabled={zipLoading} style={{
              padding: isMobile ? '6px 12px' : '8px 20px', background: zipLoading ? '#ccc' : '#1677ff', color: '#fff', border: 'none',
              borderRadius: 6, cursor: zipLoading ? 'not-allowed' : 'pointer', fontSize: isMobile ? 11 : 13, fontWeight: 600, whiteSpace: 'nowrap'
            }}>{zipLoading ? '打包中...' : '📦 全部请假单'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 12 : 24, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...cardStyle, color: '#262626' }}>{participations.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>总参与</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...cardStyle, color: '#52c41a' }}>{attending.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>参加</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...cardStyle, color: '#ff4d4f' }}>{onLeave.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>请假</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...cardStyle, color: '#fa8c16' }}>{absent.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>缺勤</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        <div style={{ padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15 }}>参与记录 ({participations.length})</h3>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>加载中...</div>
        ) : participations.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>暂无参与记录</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 650 : 0, fontSize: isMobile ? 12 : 13 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: isMobile ? '8px 8px' : '10px 16px', fontSize: 13, color: '#999', whiteSpace: 'nowrap' }}>姓名</th>
                {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>学号</th>}
                {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>电话</th>}
                <th style={{ padding: isMobile ? '8px 8px' : '10px 16px', fontSize: 13, color: '#999', whiteSpace: 'nowrap' }}>状态</th>
                {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>请假事由</th>}
                <th style={{ padding: isMobile ? '8px 8px' : '10px 16px', fontSize: 13, color: '#999', whiteSpace: 'nowrap' }}>请假单</th>
                <th style={{ padding: isMobile ? '8px 8px' : '10px 16px', fontSize: 13, color: '#999', whiteSpace: 'nowrap' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {participations.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0', background: p.is_absent ? '#fff7e6' : 'transparent' }}>
                  <td style={{ padding: isMobile ? '8px 8px' : '10px 16px', fontSize: 14, fontWeight: 600 }}>
                    <Link to={`/admin/member/${p.member_id}`} style={{ color: '#262626', textDecoration: 'none' }}>{p.member_name}</Link>
                  </td>
                  {!isMobile && <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{p.student_id || '-'}</td>}
                  {!isMobile && <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{p.phone || '-'}</td>}
                  <td style={{ padding: isMobile ? '8px 8px' : '10px 16px', fontSize: 13 }}>
                    {p.is_absent ? (
                      <span style={{ color: '#fa8c16', background: '#fff7e6', padding: '2px 8px', borderRadius: 4 }}>⚠️ 缺勤</span>
                    ) : p.will_attend ? (
                      <span style={{ color: '#52c41a', background: '#f6ffed', padding: '2px 8px', borderRadius: 4 }}>✅ 参加</span>
                    ) : (
                      <span style={{ color: '#ff4d4f', background: '#fff1f0', padding: '2px 8px', borderRadius: 4 }}>📝 请假</span>
                    )}
                  </td>
                  {!isMobile && <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{p.leave_reason || '-'}</td>}
                  <td style={{ padding: isMobile ? '8px 8px' : '10px 16px', fontSize: 13 }}>
                    {p.leave_file_name ? (
                      <button onClick={() => handleDownloadFile(p.leave_file_path, p.leave_file_name)} style={{
                        background: 'none', border: 'none', color: '#d4380d', fontSize: 12, cursor: 'pointer', textDecoration: 'underline'
                      }}>
                        📎 {isMobile ? '下载' : p.leave_file_name}
                      </button>
                    ) : '-'}
                  </td>
                  <td style={{ padding: isMobile ? '8px 8px' : '10px 16px', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handleToggleAbsent(p.id)} style={{
                      background: 'none', border: 'none', color: p.is_absent ? '#52c41a' : '#fa8c16', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>{p.is_absent ? '取消缺勤' : '标记缺勤'}</button>
                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', fontSize: 11, cursor: 'pointer' }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}