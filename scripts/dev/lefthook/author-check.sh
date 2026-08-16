#!/usr/bin/env bash

name=$(git config user.name)
email=$(git config user.email)

case "$name" in
  *ai*|*assistant*|*bot*|*copilot*|*agent*)
    echo ""
    echo "  ❌ Commit author 被拦截"
    echo "  author name: '$name'"
    echo "  包含禁止的占位词（ai / assistant / bot / copilot / agent）"
    echo ""
    echo "  请设置真实的身份后重新提交："
    echo "    git config user.name \"Your Name\""
    echo "    git config user.email \"your.email@example.com\""
    echo ""
    exit 1
    ;;
esac

case "$email" in
  *aiasys.local*|*example.com*|*test.com*|*no-reply*|*bot@*|*ai@*|*assistant@*)
    echo ""
    echo "  ❌ Commit author 被拦截"
    echo "  author email: '$email'"
    echo "  看起来像是占位地址"
    echo ""
    echo "  请设置真实的邮箱后重新提交："
    echo "    git config user.email \"your.email@example.com\""
    echo ""
    exit 1
    ;;
esac

echo "  ✓ author check passed: $name <$email>"
