module.exports = {
  apps: [{
    name: 'party-leave-system',
    script: 'server/index.js',
    cwd: '/opt/party-leave-system',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      // ⚠️ 请修改为随机字符串！
      JWT_SECRET: 'party-leave-secret-2024-change-me'
    },
    // 自动重启配置
    max_memory_restart: '500M',
    // 日志配置
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true
  }]
};