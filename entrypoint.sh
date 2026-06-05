#!/bin/bash
#
# SecureDoc 前端 — 部署启动脚本
# 构建（npm run build）应在发布/镜像构建阶段完成，此脚本仅启动静态服务。
#

set -e

PORT="${PORT:-3000}"

echo "Starting SecureDoc frontend on port ${PORT}..."
exec npx serve -s build -l "${PORT}"
