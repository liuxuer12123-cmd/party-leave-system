#!/bin/bash
# ============================================================
# 在云服务器上执行的初始化脚本（Ubuntu / CentOS）
# ============================================================
set -e

echo "========================================"
echo "  党员活动管理平台 - 服务器初始化"
echo "========================================"
echo ""

APP_DIR="/opt/party-leave-system"

# ---------- 1. 安装 Node.js 18+ ----------
install_node() {
    if command -v node &>/dev/null; then
        NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VER" -ge 18 ]; then
            echo "[✓] Node.js $(node -v) 已安装"
            return
        fi
    fi
    echo "[*] 正在安装 Node.js 18 ..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "[✓] Node.js $(node -v) 安装完成"
}

# ---------- 2. 安装 PM2 ----------
install_pm2() {
    if command -v pm2 &>/dev/null; then
        echo "[✓] PM2 已安装"
        return
    fi
    echo "[*] 正在安装 PM2 ..."
    sudo npm install -g pm2
    echo "[✓] PM2 安装完成"
}

# ---------- 3. 安装依赖 ----------
install_deps() {
    echo "[*] 安装项目依赖 ..."
    cd "$APP_DIR/server"
    npm install --production
    echo "[✓] 依赖安装完成"
}

# ---------- 4. 创建 uploads 和 logs 目录 ----------
create_dirs() {
    mkdir -p "$APP_DIR/server/uploads"
    mkdir -p "$APP_DIR/logs"
    echo "[✓] 目录已创建"
}

# ---------- 5. 设置 PM2 开机启动 ----------
setup_pm2_startup() {
    echo "[*] 配置 PM2 开机启动 ..."
    sudo pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null || true
    echo "[✓] PM2 开机启动已配置"
}

# ---------- 6. 启动/重启应用 ----------
start_app() {
    echo "[*] 启动应用 ..."
    cd "$APP_DIR"
    pm2 delete party-leave-system 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    echo "[✓] 应用已启动"
}

# ---------- 执行 ----------
echo ""
echo "开始安装..."
install_node
install_pm2
install_deps
create_dirs
setup_pm2_startup
start_app

echo ""
echo "========================================"
echo "  ✅ 安装完成！"
echo "========================================"
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):3001"
echo ""
echo "  常用命令:"
echo "    pm2 status             查看状态"
echo "    pm2 logs               查看日志"
echo "    pm2 restart party-leave-system  重启"
echo "    pm2 stop party-leave-system     停止"
echo "========================================"