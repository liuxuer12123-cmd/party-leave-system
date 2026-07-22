import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { user, api, activities, isMobile } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/admin/login'); return; }
    loadAllStats();
  }, [user, activities]);

  const loadAllStats = async () => {
    try {
      const results = await Promise.all(
        activities.map(a => api.get(`/activities/${a.id}/stats`).then(r => ({ ...r.data, ...a })))
      );
      setStats(results);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (!user) return null;

  const totalActivities = stats.length;
  const totalParticipations = stats.reduce((s, a) => s + a.total, 0);
  const totalAttending = stats.reduce((s, a) => s + a.attending, 0);
  const totalOnLeave = stats.reduce((s, a) => s + a.onLeave, 0);
  const totalAbsent = stats.reduce((s, a) => s + (a.absent || 0), 0);

  const attendRate = totalParticipations > 0 ? Math.round((totalAttending / totalParticipations) * 100) : 0;
  const leaveRate = totalParticipations > 0 ? Math.round((totalOnLeave / totalParticipations) * 100) : 0;
  const absentRate = totalParticipations > 0 ? Math.round((totalAbsent / totalParticipations) * 100) : 0;

  const pieData = [
    { name: '参加', value: totalAttending },
    { name: '请假', value: totalOnLeave },
    { name: '缺勤', value: totalAbsent }
  ];
  const COLORS = ['#52c41a', '#ff4d4f', '#fa8c16'];

  return (
    <div>
      <h2 style={{ fontSize: isMobile ? 16 : 18, marginBottom: isMobile ? 14 : 20 }}>📊 管理总览</h2>

      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 24
      }}>
        <StatCard label="活动总数" value={totalActivities} color="#d4380d" icon="📋" isMobile={isMobile} />
        <StatCard label="出勤率" value={`${attendRate}%`} color="#52c41a" icon="✅" isMobile={isMobile} />
        <StatCard label="请假率" value={`${leaveRate}%`} color="#ff4d4f" icon="📝" isMobile={isMobile} />
        <StatCard label="缺勤率" value={`${absentRate}%`} color="#fa8c16" icon="⚠️" isMobile={isMobile} />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: isMobile ? 16 : 20, marginBottom: isMobile ? 16 : 24
      }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: isMobile ? 14 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, marginBottom: isMobile ? 10 : 16 }}>各活动参与情况</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
              <Tooltip />
              <Bar dataKey="attending" name="参加" fill="#52c41a" radius={[4,4,0,0]} />
              <Bar dataKey="onLeave" name="请假" fill="#ff4d4f" radius={[4,4,0,0]} />
              <Bar dataKey="absent" name="缺勤" fill="#fa8c16" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', borderRadius: 8, padding: isMobile ? 14 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, marginBottom: isMobile ? 10 : 16 }}>总体占比</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={isMobile ? 40 : 60} outerRadius={isMobile ? 65 : 90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, padding: isMobile ? 14 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        <h3 style={{ fontSize: isMobile ? 14 : 15, marginBottom: isMobile ? 10 : 16 }}>最近活动</h3>
        {stats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无数据</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>活动名称</th>
                <th style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>日期</th>
                <th style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>参与人数</th>
                <th style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>参加</th>
                <th style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>请假</th>
                <th style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>缺勤</th>
                <th style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px', fontSize: 14 }}>{a.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#666' }}>{a.date}</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600 }}>{a.total}</td>
                  <td style={{ padding: '10px 12px', color: '#52c41a', fontSize: 14 }}>{a.attending}</td>
                  <td style={{ padding: '10px 12px', color: '#ff4d4f', fontSize: 14 }}>{a.onLeave}</td>
                  <td style={{ padding: '10px 12px', color: '#fa8c16', fontSize: 14 }}>{a.absent || 0}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Link to={`/admin/activity/${a.id}`} style={{ color: '#d4380d', fontSize: 13 }}>查看详情</Link>
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

function StatCard({ label, value, color, icon, sub, isMobile }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 8, padding: isMobile ? '12px 14px' : '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}`
    }}>
      <div style={{ fontSize: isMobile ? 11 : 13, color: '#999', marginBottom: isMobile ? 4 : 8 }}>{icon} {label}</div>
      <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}