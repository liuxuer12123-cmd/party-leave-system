import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';

export default function MemberDetail() {
  const { id } = useParams();
  const { user, api, isMobile } = useApp();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

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
                    <td style={{ padding: isMobile ? '8px 10px' : '10px 16px' }}>
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
    </div>
  );
}