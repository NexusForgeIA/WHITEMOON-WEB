#!/bin/bash
set -euo pipefail

# Install system dependencies needed by HyperFrames (video render/inspect).
# Runs only in Claude Code on the web (remote) sessions; no-op locally.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Idempotent: container state is cached, so skip if ffmpeg is already present.
if command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg already present: $(ffmpeg -version | head -1)"
  exit 0
fi

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  # Keep apt output out of the session context; surface only on failure.
  if $SUDO apt-get update -y >/tmp/ffmpeg-install.log 2>&1 \
     && $SUDO apt-get install -y ffmpeg >>/tmp/ffmpeg-install.log 2>&1; then
    echo "ffmpeg installed: $(ffmpeg -version | head -1)"
  else
    echo "ERROR: ffmpeg install failed; see /tmp/ffmpeg-install.log" >&2
    tail -20 /tmp/ffmpeg-install.log >&2 || true
    exit 1
  fi
else
  echo "WARNING: apt-get not found; install ffmpeg manually for HyperFrames rendering." >&2
fi
