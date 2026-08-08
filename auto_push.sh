#!/bin/bash
# 解决目录所有权问题
git config --global --add safe.directory /vol1/1000/docker/astro-koharu

REPO_DIR="/vol1/1000/docker/astro-koharu"
PROXY="http://127.0.0.1:7890"
export http_proxy="$PROXY"
export https_proxy="$PROXY"

# 跳过 SSH 主机密钥验证（避免交互式确认）
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

cd "$REPO_DIR" || exit 1

if git status --porcelain | grep -q .; then
    echo "检测到变动，准备提交..."
    git add .
    git commit -m "自动提交 $(date '+%Y-%m-%d %H:%M:%S')"
    if git push origin main; then
        echo "提交并推送成功。"
    else
        echo "推送失败，请检查网络或 SSH 密钥配置。"
        exit 1
    fi
else
    echo "没有变动，无需提交。"
fi
