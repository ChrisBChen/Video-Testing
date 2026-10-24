#!/usr/bin/env bash
# Downloads the Piper voice used for narration into audio_cache/ (about 120 MB, not committed).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio_cache
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high
for f in en_US-ryan-high.onnx en_US-ryan-high.onnx.json; do
  [ -f "audio_cache/$f" ] || curl -sSL -o "audio_cache/$f" "$BASE/$f"
done
echo "voice ready: audio_cache/en_US-ryan-high.onnx"
