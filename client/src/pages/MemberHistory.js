import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';

export default function MemberHistory() {
  const { user, api, isMobile } = useApp();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/admin/login'); return; }
    loadMembers();
  }, [user]);

  const loadMembers = async () => {
    try {
      const { data } = await api.get('/admin/members');
      setMembers(data);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/admin/export', { params: { type: 'member' } });
      const wsData = [
        ['姓名', '学号', '电话', '活动总数', '参加次数', '请假次数', '缺勤次数', '请假事由汇总']
      ];
      data.forEach(r => {
        wsData.push([r.name, r.student_id, r.phone, r.total_activities, r.attended, r.leave_count, r.absent_count || 0, r.leave_reasons || '-']);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '成员统计');
      XLSX.writeFile(wb, '党员活动统计汇总.xlsx');
    } catch (e) { alert('导出失败'); }
  };

  if (!user) return null;

  const filteredMembers = members.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'leave') return m.leave_count > 0;
    if (filter === 'absent') return (m.absent_count || 0) > 0;
    if (filter === 'perfect') return m.leave_count === 0 && (m.absent_count || 0) === 0 && m.total_activities > 0;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 14 : 20, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: isMobile ? 16 : 18 }}>👥 成员统计</h2>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['all', 'perfect', 'leave', 'absent'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 11, border: filter === f ? '1px solid #d4380d' : '1px solid #d9d9d9',
                background: filter === f ? '#fff1f0' : '#fff', color: filter === f ? '#d4380d' : '#666', cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
                {f === 'all' ? '全部' : f === 'perfect' ? '全勤' : f === 'leave' ? '有请假' : '有缺勤'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleExport} style={{
          padding: isMobile ? '6px 14px' : '8px 20px', background: '#52c41a', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: isMobile ? 12 : 13, fontWeight: 600, whiteSpace: 'nowrap'
        }}>📥 导出 Excel</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>加载中...</div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>暂无成员数据</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, fontSize: isMobile ? 12 : 14 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>姓名</th>
                {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>学号</th>}
                {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>电话</th>}
                <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>活动总数</th>
                <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>参加</th>
                <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>请假</th>
                <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>缺勤</th>
                {!isMobile && <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>出勤率</th>}
                <th style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(m => {
                const rate = m.total_activities > 0 ? Math.round((m.attended / m.total_activities) * 100) : 0;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600 }}>
                      <Link to={`/admin/member/${m.id}`} style={{ color: '#262626', textDecoration: 'none' }}>{m.name}</Link>
                      {isMobile && <div style={{ fontSize: 11, color: '#999' }}>{m.student_id || ''}</div>}
                    </td>
                    {!isMobile && <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{m.student_id || '-'}</td>}
                    {!isMobile && <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{m.phone || '-'}</td>}
                    <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600 }}>{m.total_activities}</td>
                    <td style={{ padding: '10px 16px', color: '#52c41a', fontSize: 14 }}>{m.attended}</td>
                    <td style={{ padding: '10px 16px', color: '#ff4d4f', fontSize: 14 }}>{m.leave_count}</td>
                    <td style={{ padding: '10px 16px', color: '#fa8c16', fontSize: 14 }}>{m.absent_count || 0}</td>
                    {!isMobile && <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? '#52c41a' : rate >= 50 ? '#faad14' : '#ff4d4f', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#666', minWidth: 36 }}>{rate}%</span>
                      </div>
                    </td>}
                    <td style={{ padding: '10px 16px' }}>
                      <Link to={`/admin/member/${m.id}`} style={{ color: '#d4380d', fontSize: 13, textDecoration: 'none' }}>详情</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}