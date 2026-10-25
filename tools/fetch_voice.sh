#!/usr/bin/env bash
# Downloads the Kokoro-82M ONNX model and voice pack (about 350 MB, not committed) into audio_cache/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio_cache
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -f "audio_cache/$f" ] || curl -sSL -o "audio_cache/$f" "$BASE/$f"
done
echo "voice model ready in audio_cache/"
