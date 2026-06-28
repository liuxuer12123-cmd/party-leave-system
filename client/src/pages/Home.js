import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Home() {
  const { activities, isMobile } = useApp();

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #d4380d 0%, #e65b3a 50%, #ff7a45 100%)',
        borderRadius: isMobile ? 8 : 12, padding: isMobile ? '24px 20px' : '40px 48px',
        marginBottom: isMobile ? 20 : 32, color: '#fff'
      }}>
        <h1 style={{ fontSize: isMobile ? 20 : 28, marginBottom: 8 }}>欢迎使用党员活动管理平台</h1>
        <p style={{ fontSize: isMobile ? 13 : 15, opacity: 0.9 }}>
          请选择您要参与的活动，填写您的参与信息。如需请假，请下载请假单模版并上传。
        </p>
        <div style={{ marginTop: 16 }}>
          <Link to="/admin/login" style={{
            color: '#fff', textDecoration: 'underline', fontSize: 13, opacity: 0.8
          }}>管理员入口</Link>
        </div>
      </div>

      <h2 style={{ fontSize: isMobile ? 16 : 18, marginBottom: 16, color: '#262626' }}>📋 近期活动列表</h2>

      {activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999', background: '#fff', borderRadius: 8 }}>
          暂无活动
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {activities.map(a => {
            const past = a.deadline && new Date() > new Date(a.deadline);
            return past ? (
              <div
                key={a.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fafafa', padding: isMobile ? '14px 16px' : '20px 24px', borderRadius: 8,
                  color: '#bbb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'not-allowed',
                  flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 8 : 0
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: isMobile ? 14 : 16, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ fontSize: isMobile ? 12 : 13, color: '#bbb' }}>
                    📅 {a.date} {a.location ? `| 📍 ${a.location}` : ''}
                  </div>
                  {a.deadline && (
                    <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
                      ⏰ 报名已截止 ({a.deadline.replace('T', ' ')})
                    </div>
                  )}
                </div>
                <div style={{
                  background: '#f5f5f5', color: '#bbb', padding: '6px 16px',
                  borderRadius: 4, fontSize: 13, fontWeight: 600, flexShrink: 0
                }}>已截止</div>
              </div>
            ) : (
              <Link
                key={a.id}
                to={`/activity/${a.id}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fff', padding: isMobile ? '14px 16px' : '20px 24px', borderRadius: 8,
                  textDecoration: 'none', color: '#262626', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.2s', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 8 : 0
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: isMobile ? 14 : 16, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ fontSize: isMobile ? 12 : 13, color: '#999' }}>
                    📅 {a.date} {a.location ? `| 📍 ${a.location}` : ''}
                  </div>
                  {a.deadline && (
                    <div style={{ fontSize: 12, color: '#fa8c16', marginTop: 4 }}>
                      ⏰ 报名截止：{a.deadline.replace('T', ' ')}
                    </div>
                  )}
                </div>
                <div style={{
                  background: '#fff1f0', color: '#d4380d', padding: '6px 16px',
                  borderRadius: 4, fontSize: 13, fontWeight: 600, flexShrink: 0
                }}>我要报名 →</div>
              </Link>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: isMobile ? 20 : 32, background: '#fff', borderRadius: 8,
        padding: isMobile ? 16 : 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ fontSize: isMobile ? 14 : 15, marginBottom: 8, color: '#262626' }}>📌 使用说明</h3>
        <ol style={{ fontSize: 13, color: '#666', lineHeight: 2, paddingLeft: 20 }}>
          <li>在活动列表中点击"我要报名"进入对应活动页面</li>
          <li>填写您的姓名、学号和联系电话</li>
          <li>选择是否参加该活动</li>
          <li>如不能参加，请选择请假事由，下载请假单模版填写后上传</li>
        </ol>
      </div>
    </div>
  );
}