import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';

export default function MemberDetail() {
  const { id } = useParams();
  const { user, api, isMobile, categories } = useApp();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editModal, setEditModal] = useState(null); // participation row
  const [editStudentId, setEditStudentId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLeaveReason, setEditLeaveReason] = useState('');
  const [editLeaveFile, setEditLeaveFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/admin/login'); return; }
    loadDetail();
  }, [user, id]);

  const loadDetail = async () => {
    try {
      const { data } = await api.get(`/admin/members/${id}/detail`);
      setDetail(data);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const leaveCategoryStats = useMemo(() => {
    if (!detail) return [];
    const leaveRecords = detail.participations.filter(p => p.will_attend === 0 && p.is_absent === 0);
    const countMap = {};
    leaveRecords.forEach(p => {
      const reason = p.leave_reason || '未分类';
      countMap[reason] = (countMap[reason] || 0) + 1;
    });
    return Object.entries(countMap).map(([name, value]) => ({ name, value }));
  }, [detail]);

  const LEAVE_COLORS = ['#d4380d', '#fa8c16', '#fadb14', '#52c41a', '#1677ff', '#722ed1', '#eb2f96', '#13c2c2'];

  if (!user) return null;
  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>加载中...</div>;
  if (!detail) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>成员不存在</div>;

  const { member, participations, stats } = detail;
  const attendanceRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  const handleToggleAbsent = async (pid) => {
    try {
      await api.patch(`/participations/${pid}/toggle-absent`);
      loadDetail();
    } catch (e) { /* ignore */ }
  };

  // ── Edit participation ──
  const openEdit = (p) => {
    let status = 'attend';
    if (p.is_absent) status = 'absent';
    else if (!p.will_attend) status = 'leave';
    setEditModal(p);
    setEditStudentId(member.student_id || '');
    setEditPhone(member.phone || '');
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
      // Update member info
      await api.put(`/members/${member.id}`, {
        student_id: editStudentId,
        phone: editPhone
      });

      // Update participation status
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
      loadDetail();
    } catch (e) { alert('修改失败'); }
    setEditSaving(false);
  };

  return (
    <div>
      <Link to="/admin/members" style={{ color: '#d4380d', fontSize: 13, textDecoration: 'none' }}>← 返回成员统计</Link>

      <div style={{ marginTop: 16, background: '#fff', borderRadius: 8, padding: isMobile ? 14 : 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: isMobile ? 18 : 22, marginBottom: 8 }}>👤 {member.name}</h2>
            <div style={{ display: 'flex', gap: isMobile ? 10 : 20, fontSize: 13, color: '#666', flexWrap: 'wrap' }}>
              {member.student_id && <span>学号: {member.student_id}</span>}
              {member.phone && <span>电话: {member.phone}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: isMobile ? 12 : 24, textAlign: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#262626' }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: '#999' }}>活动总数</div>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#52c41a' }}>{stats.attended}</div>
              <div style={{ fontSize: 12, color: '#999' }}>参加</div>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#ff4d4f' }}>{stats.onLeave}</div>
              <div style={{ fontSize: 12, color: '#999' }}>请假</div>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#fa8c16' }}>{stats.absent || 0}</div>
              <div style={{ fontSize: 12, color: '#999' }}>缺勤</div>
            </div>
            <div>
              <div style={{
                fontSize: isMobile ? 20 : 28, fontWeight: 700,
                color: attendanceRate >= 80 ? '#52c41a' : attendanceRate >= 50 ? '#faad14' : '#ff4d4f'
              }}>{attendanceRate}%</div>
              <div style={{ fontSize: 12, color: '#999' }}>出勤率</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: isMobile ? 14 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, marginBottom: 16 }}>📊 请假类型分析</h3>
          {leaveCategoryStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无请假记录</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <PieChart>
                  <Pie data={leaveCategoryStats} cx="50%" cy="50%" outerRadius={isMobile ? 60 : 80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {leaveCategoryStats.map((entry, i) => (
                      <Cell key={i} fill={LEAVE_COLORS[i % LEAVE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12 }}>
                {leaveCategoryStats.map((item, i) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: LEAVE_COLORS[i % LEAVE_COLORS.length], marginRight: 6 }} />
                      {item.name}
                    </span>
                    <span style={{ fontWeight: 600 }}>{item.value} 次</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto' }}>
          <div style={{ padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ fontSize: isMobile ? 14 : 15 }}>📋 活动参与历史 ({participations.length})</h3>
          </div>
          {participations.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>暂无参与记录</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500, fontSize: isMobile ? 12 : 13 }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 13, color: '#999' }}>活动名称</th>
                  <th style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 13, color: '#999' }}>日期</th>
                  <th style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 13, color: '#999' }}>状态</th>
                  {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>请假事由</th>}
                  {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>请假单</th>}
                  <th style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 13, color: '#999' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {participations.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0', background: p.is_absent ? '#fff7e6' : 'transparent' }}>
                    <td style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 14 }}>{p.activity_name}</td>
                    <td style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 13, color: '#666' }}>{p.activity_date}</td>
                    <td style={{ padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 13 }}>
                      {p.is_absent ? (
                        <span style={{ color: '#fa8c16', background: '#fff7e6', padding: '2px 8px', borderRadius: 4 }}>⚠️ 缺勤</span>
                      ) : p.will_attend ? (
                        <span style={{ color: '#52c41a', background: '#f6ffed', padding: '2px 8px', borderRadius: 4 }}>✅ 参加</span>
                      ) : (
                        <span style={{ color: '#ff4d4f', background: '#fff1f0', padding: '2px 8px', borderRadius: 4 }}>📝 请假</span>
                      )}
                    </td>
                    {!isMobile && <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{p.leave_reason || '-'}</td>}
                    {!isMobile && <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      {p.leave_file_name ? (
                        <a href={`/api/files/${p.leave_file_path}`} download style={{ color: '#d4380d', textDecoration: 'none' }}>
                          📎 下载
                        </a>
                      ) : '-'}
                    </td>}
                    <td style={{ padding: isMobile ? '8px 10px' : '10px 16px', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => openEdit(p)} style={{
                        background: 'none', border: 'none', color: '#1677ff', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
                      }}>编辑</button>
                      <button onClick={() => handleToggleAbsent(p.id)} style={{
                        background: 'none', border: 'none', color: p.is_absent ? '#52c41a' : '#fa8c16', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
                      }}>{p.is_absent ? '取消缺勤' : '标记缺勤'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setEditModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 24, width: 460, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4, fontSize: 16 }}>✏️ {member.name} — {editModal.activity_name}</h3>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>修改成员信息和参与状态</p>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>学号</label>
              <input value={editStudentId} onChange={e => setEditStudentId(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>电话</label>
              <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>状态 <span style={{ color: '#d4380d' }}>*</span></label>
              <select value={editStatus} onChange={e => { setEditStatus(e.target.value); setEditError(''); }} style={selectStyle}>
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
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 5 };
const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4,
  fontSize: 13, outline: 'none'
};
const selectStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4,
  fontSize: 13, outline: 'none', background: '#fff'
};