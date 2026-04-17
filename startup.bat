@echo off
title 英语单词学习项目 - 启动中...
cd /d "%~dp0"

echo ==========================================
echo    英语单词学习项目 - 一键启动脚本
echo ==========================================
echo.

echo [1/2] 正在检查依赖项...
if not exist node_modules (
    echo [!] 未发现 node_modules，正在执行 npm install...
    call npm install
)

echo [2/2] 正在启动开发服务器 (next dev)...
echo.
echo ------------------------------------------
echo 项目访问地址: http://localhost:3000
echo 退出请直接关闭此窗口或按 Ctrl+C
echo ------------------------------------------
echo.

npm run dev

pause
