#!/bin/bash
# ============================================================
# 在本地执行：打包项目并上传到腾讯云服务器
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh <服务器IP> [用户名]
#
# 示例:
#   ./deploy.sh 123.45.67.89
#   ./deploy.sh 123.45.67.89 root
# ============================================================
set -e

SERVER_IP="${1:?请提供服务器 IP，例如: ./deploy.sh 123.45.67.89}"
SERVER_USER="${2:-root}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_NAME="party-leave-system-$(date +%Y%m%d-%H%M%S).tar.gz"
APP_DIR="/opt/party-leave-system"

echo "========================================"
echo "  党员活动管理平台 - 部署脚本"
echo "========================================"
echo ""
echo "  服务器: $SERVER_USER@$SERVER_IP"
echo "  部署目录: $APP_DIR"
echo ""

# ---------- 1. 确认前端已构建 ----------
if [ ! -d "$PROJECT_DIR/client/build" ]; then
    echo "[*] 前端未构建，正在构建..."
    cd "$PROJECT_DIR/client"
    npm run build
    echo "[✓] 前端构建完成"
else
    echo "[✓] 前端已构建"
fi

# ---------- 2. 打包项目（不含 node_modules） ----------
echo "[*] 正在打包项目..."
cd "$PROJECT_DIR"
tar -czf "/tmp/$PACKAGE_NAME" \
    --exclude='node_modules' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    server/ \
    client/build/ \
    ecosystem.config.js \
    server-setup.sh
echo "[✓] 打包完成: /tmp/$PACKAGE_NAME"
echo "    大小: $(du -h /tmp/$PACKAGE_NAME | cut -f1)"

# ---------- 3. 上传到服务器 ----------
echo "[*] 上传到服务器..."
scp "/tmp/$PACKAGE_NAME" "$SERVER_USER@$SERVER_IP:/tmp/"
echo "[✓] 上传完成"

# ---------- 4. 在服务器上解压并安装 ----------
echo "[*] 在服务器上解压并安装..."
ssh "$SERVER_USER@$SERVER_IP" << REMOTE_SCRIPT
set -e

echo "========================================"
echo "  服务器端部署 - 开始"
echo "========================================"

# 创建目录
sudo mkdir -p $APP_DIR
sudo chown -R \$USER:\$USER $APP_DIR

# 解压文件
cd $APP_DIR
tar -xzf /tmp/$PACKAGE_NAME --strip-components=0
echo "[✓] 文件已解压到 $APP_DIR"

# 执行初始化脚本
chmod +x server-setup.sh
./server-setup.sh

# 清理临时文件
rm -f /tmp/$PACKAGE_NAME

echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo "========================================"
pm2 status
REMOTE_SCRIPT

# ---------- 5. 清理本地临时文件 ----------
rm -f "/tmp/$PACKAGE_NAME"
echo ""
echo "========================================"
echo "  🎉 部署成功！"
echo "  访问地址: http://$SERVER_IP:3001"
echo "========================================"

# ---------- 6. 提醒防火墙 ----------
echo ""
echo "⚠️  重要提醒："
echo "  1. 请确保云服务器安全组放行了 3001 端口"
echo "  2. 腾讯云管理后台 → 安全组 → 入站规则 → 添加 TCP:3001"
echo "  3. 如果使用 CentOS，可能还需要关闭系统防火墙："
echo "     sudo firewall-cmd --add-port=3001/tcp --permanent"
echo "     sudo firewall-cmd --reload"
echo "  4. 查看应用日志: ssh $SERVER_USER@$SERVER_IP 'pm2 logs'"