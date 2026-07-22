import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';

export default function AdminActivityDetail() {
  const { id } = useParams();
  const { user, api, activities, categories, isMobile } = useApp();
  const navigate = useNavigate();
  const activity = activities.find(a => a.id === id);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zipLoading, setZipLoading] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState(null); // { pid, will_attend, leave_reason, is_absent, member_name }
  const [editStatus, setEditStatus] = useState('');
  const [editLeaveReason, setEditLeaveReason] = useState('');
  const [editLeaveFile, setEditLeaveFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Batch add modal state
  const [batchModal, setBatchModal] = useState(false);
  const [batchNames, setBatchNames] = useState('');
  const [batchStatus, setBatchStatus] = useState('attend');
  const [batchLeaveReason, setBatchLeaveReason] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

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

  // ── Edit participation ──
  const openEdit = (p) => {
    let status = 'attend';
    if (p.is_absent) status = 'absent';
    else if (!p.will_attend) status = 'leave';
    setEditModal(p);
    setEditStatus(status);
    setEditLeaveReason(p.leave_reason || '');
    setEditLeaveFile(null);
    setEditSaving(false);
    setEditError('');
  };

  const handleEditSave = async () => {
    setEditError('');

    // Validate: leave status requires file and reason
    if (editStatus === 'leave') {
      if (!editLeaveReason) return setEditError('请假时必须选择请假事由');
      if (!editLeaveFile && !editModal.leave_file_path) return setEditError('请假时必须上传请假条');
    }

    setEditSaving(true);
    try {
      const will_attend = editStatus === 'leave' ? 0 : 1;
      const is_absent = editStatus === 'absent' ? 1 : 0;

      if (editLeaveFile) {
        const fd = new FormData();
        fd.append('will_attend', will_attend);
        fd.append('is_absent', is_absent);
        fd.append('leave_reason', editLeaveReason);
        fd.append('leave_file', editLeaveFile);
        await api.put(`/participations/${editModal.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.put(`/participations/${editModal.id}`, {
          will_attend,
          is_absent,
          leave_reason: editLeaveReason
        });
      }
      setEditModal(null);
      loadData();
    } catch (e) { alert('修改失败'); }
    setEditSaving(false);
  };

  // ── Batch add ──
  const handleBatchSave = async () => {
    const names = batchNames.split('\n').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return alert('请至少输入一个姓名');
    setBatchSaving(true);
    try {
      const { data } = await api.post(`/activities/${id}/participations/batch`, {
        names,
        will_attend: batchStatus,
        leave_reason: batchStatus === 'leave' ? batchLeaveReason : ''
      });
      setBatchModal(false);
      setBatchNames('');
      setBatchStatus('attend');
      setBatchLeaveReason('');
      loadData();
      alert(`成功新增 ${data.count} 名成员（${names.length - data.count} 名已存在被跳过）`);
    } catch (e) { alert('批量新增失败'); }
    setBatchSaving(false);
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
            <button onClick={() => setBatchModal(true)} style={{
              padding: isMobile ? '6px 12px' : '8px 20px', background: '#722ed1', color: '#fff', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontSize: isMobile ? 11 : 13, fontWeight: 600, whiteSpace: 'nowrap'
            }}>＋ 批量新增</button>
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
                    <button onClick={() => openEdit(p)} style={{
                      background: 'none', border: 'none', color: '#1677ff', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>编辑</button>
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

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setEditModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 24, width: 440, maxWidth: '90vw',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>✏️ 修改状态 — {editModal.member_name}</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>状态</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={selectStyle}>
                <option value="attend">✅ 参加</option>
                <option value="leave">📝 请假</option>
                <option value="absent">⚠️ 缺勤</option>
              </select>
            </div>

            {editStatus === 'leave' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>请假事由 <span style={{ color: '#d4380d' }}>*</span></label>
                  <select value={editLeaveReason} onChange={e => { setEditLeaveReason(e.target.value); setEditError(''); }} style={selectStyle}>
                    <option value="">请选择</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>上传请假条 <span style={{ color: '#d4380d' }}>*</span></label>
                  <input type="file" onChange={e => { setEditLeaveFile(e.target.files[0]); setEditError(''); }}
                    accept=".docx,.doc,.pdf,.jpg,.jpeg,.png,.gif,.bmp"
                    style={{ fontSize: 13 }} />
                  {editLeaveFile && <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>新文件: {editLeaveFile.name}</div>}
                  {!editLeaveFile && editModal.leave_file_path && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>当前: {editModal.leave_file_name || editModal.leave_file_path}</div>
                  )}
                </div>
              </>
            )}

            {editError && (
              <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '6px 10px', marginBottom: 12, color: '#cf1322', fontSize: 12 }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditModal(null)} style={{
                padding: '6px 20px', background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4,
                cursor: 'pointer', fontSize: 13
              }}>取消</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{
                padding: '6px 20px', background: editSaving ? '#ccc' : '#d4380d', color: '#fff', border: 'none',
                borderRadius: 4, cursor: editSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600
              }}>{editSaving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Add Modal ── */}
      {batchModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setBatchModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 24, width: 480, maxWidth: '90vw',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4, fontSize: 16 }}>＋ 批量新增成员</h3>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>每行一个姓名，已存在的成员会自动跳过</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>成员姓名</label>
              <textarea value={batchNames} onChange={e => setBatchNames(e.target.value)}
                placeholder={"张三\n李四\n王五"}
                style={{ ...selectStyle, height: 120, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>统一状态</label>
              <select value={batchStatus} onChange={e => setBatchStatus(e.target.value)} style={selectStyle}>
                <option value="attend">✅ 参加</option>
                <option value="leave">📝 请假</option>
                <option value="absent">⚠️ 缺勤</option>
              </select>
            </div>

            {batchStatus === 'leave' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>请假事由</label>
                <select value={batchLeaveReason} onChange={e => setBatchLeaveReason(e.target.value)} style={selectStyle}>
                  <option value="">请选择</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setBatchModal(false)} style={{
                padding: '6px 20px', background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4,
                cursor: 'pointer', fontSize: 13
              }}>取消</button>
              <button onClick={handleBatchSave} disabled={batchSaving} style={{
                padding: '6px 20px', background: batchSaving ? '#ccc' : '#722ed1', color: '#fff', border: 'none',
                borderRadius: 4, cursor: batchSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600
              }}>{batchSaving ? '新增中...' : '确认新增'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 5 };
const selectStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4,
  fontSize: 13, outline: 'none', background: '#fff'
};