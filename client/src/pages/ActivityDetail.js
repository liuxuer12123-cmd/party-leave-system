import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ActivityDetail() {
  const { id } = useParams();
  const { api, activities, categories, loadActivities, isMobile } = useApp();
  const navigate = useNavigate();
  const activity = activities.find(a => a.id === id);

  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [willAttend, setWillAttend] = useState(true);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveFile, setLeaveFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('请填写姓名');
    setLoading(true);
    setError(null);
    try {
      const { data: member } = await api.post('/members', { name: name.trim(), student_id: studentId.trim(), phone: phone.trim() });

      const formData = new FormData();
      formData.append('activity_id', id);
      formData.append('member_id', member.id);
      formData.append('will_attend', willAttend ? 'true' : 'false');
      if (!willAttend) {
        formData.append('leave_reason', leaveReason);
        if (leaveFile) formData.append('leave_file', leaveFile);
      }

      await api.post('/participations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('✅ 提交成功！感谢您的参与。');
    } catch (err) {
      setError(err.response?.data?.error || '提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!activity) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
        活动不存在 <Link to="/" style={{ color: '#d4380d' }}>返回首页</Link>
      </div>
    );
  }

  const pastDue = activity.deadline && new Date() > new Date(activity.deadline);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Link to="/" style={{ color: '#d4380d', fontSize: 13, textDecoration: 'none' }}>← 返回活动列表</Link>

      <div style={{
        background: '#fff', borderRadius: 8, padding: isMobile ? 16 : 32,
        marginTop: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <h2 style={{ fontSize: isMobile ? 16 : 20, marginBottom: 4 }}>{activity.name}</h2>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>
          📅 {activity.date} {activity.location ? `| 📍 ${activity.location}` : ''}
        </p>
        {activity.deadline && (
          <p style={{ fontSize: 13, color: pastDue ? '#ff4d4f' : '#fa8c16', marginBottom: 16, fontWeight: 600 }}>
            ⏰ 报名截止时间：{activity.deadline.replace('T', ' ')}
            {pastDue && <span style={{ marginLeft: 8, background: '#fff1f0', padding: '2px 8px', borderRadius: 3, fontSize: 12 }}>已截止</span>}
          </p>
        )}
        {activity.description && (
          <p style={{ fontSize: 14, color: '#666', marginBottom: 24, background: '#fafafa', padding: 12, borderRadius: 4 }}>{activity.description}</p>
        )}

        {pastDue ? (
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏰</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#cf1322', marginBottom: 8 }}>报名已截止</div>
            <div style={{ fontSize: 13, color: '#999' }}>
              该活动的报名截止时间为 {activity.deadline.replace('T', ' ')}，不再接受新的报名。
            </div>
            <Link to="/" style={{ display: 'inline-block', marginTop: 16, color: '#d4380d', fontSize: 14, textDecoration: 'underline' }}>返回活动列表</Link>
          </div>
        ) : message ? (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{message}</div>
            <Link to="/" style={{ color: '#d4380d', fontSize: 14 }}>返回活动列表</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>姓名 <span style={{ color: '#d4380d' }}>*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入您的姓名" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>学号</label>
              <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="请输入您的学号" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>联系电话</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入您的联系电话" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>是否参加该活动？</label>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setWillAttend(true)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 6, border: `2px solid ${willAttend ? '#52c41a' : '#d9d9d9'}`,
                    background: willAttend ? '#f6ffed' : '#fff', color: willAttend ? '#389e0d' : '#999',
                    fontWeight: 600, cursor: 'pointer', fontSize: 15
                  }}
                >✅ 参加</button>
                <button
                  type="button"
                  onClick={() => setWillAttend(false)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 6, border: `2px solid ${!willAttend ? '#ff4d4f' : '#d9d9d9'}`,
                    background: !willAttend ? '#fff1f0' : '#fff', color: !willAttend ? '#cf1322' : '#999',
                    fontWeight: 600, cursor: 'pointer', fontSize: 15
                  }}
                >❌ 请假</button>
              </div>
            </div>

            {!willAttend && (
              <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: isMobile ? 14 : 20, marginBottom: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>请假事由分类</label>
                  <select value={leaveReason} onChange={e => setLeaveReason(e.target.value)} style={inputStyle}>
                    <option value="">请选择请假事由</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>上传请假单</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'inline-block', padding: '8px 16px', background: '#d4380d', color: '#fff',
                      borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap'
                    }}>
                      📎 选择文件
                      <input type="file" onChange={e => setLeaveFile(e.target.files[0])} accept=".docx,.doc,.pdf,.jpg,.jpeg,.png,.gif,.bmp" style={{ display: 'none' }} />
                    </label>
                    <span style={{ fontSize: 12, color: '#666', wordBreak: 'break-all' }}>
                      {leaveFile ? leaveFile.name : '未选择文件'}
                    </span>
                    <a href="/请假单-模版.docx" download style={{
                      padding: '8px 12px', background: '#fff', border: '1px solid #d9d9d9',
                      borderRadius: 4, color: '#d4380d', fontSize: 12, textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>📥 下载模版</a>
                  </div>
                  <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>支持 .docx, .pdf, .jpg, .png 等格式，大小不超过 10MB</p>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '8px 12px', marginBottom: 16, color: '#cf1322', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 0', background: loading ? '#ccc' : '#d4380d',
              color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? '提交中...' : '提交参与信息'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: 6,
  fontSize: 14, outline: 'none', transition: 'border 0.2s'
};