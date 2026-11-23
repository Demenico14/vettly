#!/usr/bin/env bash
# Downloads the local AI models Vettly runs in Docker (docker compose --profile ai) into ./models, from the
# publishers' own Hugging Face accounts, and checks each file against Hugging Face's published SHA-256.
# Usage: scripts/models/download.sh [extract|embed|rerank|ocr|write|all]   (default: all, about 7.9 GB)
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p models

# service | Hugging Face repo | file | licence
MODELS=(
  "extract|numind/NuExtract-2.0-2B-GGUF|NuExtract-2.0-2B-Q4_K_M.gguf|MIT"
  "embed|Qwen/Qwen3-Embedding-0.6B-GGUF|Qwen3-Embedding-0.6B-Q8_0.gguf|Apache-2.0"
  "rerank|ggml-org/Qwen3-Reranker-0.6B-Q8_0-GGUF|qwen3-reranker-0.6b-q8_0.gguf|Apache-2.0"
  "ocr|PaddlePaddle/PaddleOCR-VL-1.6-GGUF|PaddleOCR-VL-1.6-GGUF.gguf|Apache-2.0"
  "ocr|PaddlePaddle/PaddleOCR-VL-1.6-GGUF|PaddleOCR-VL-1.6-GGUF-mmproj.gguf|Apache-2.0"
  "write|ggml-org/gemma-4-E2B-it-GGUF|gemma-4-E2B-it-Q4_0.gguf|Apache-2.0"
)

want="${1:-all}"
for entry in "${MODELS[@]}"; do
  IFS="|" read -r service repo file licence <<<"$entry"
  [[ "$want" == "all" || "$want" == "$service" ]] || continue
  expected=$(curl -fsS -X POST "https://huggingface.co/api/models/$repo/paths-info/main" -d "paths=$file" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['lfs']['oid'])")
  if [[ -f "models/$file" ]] && [[ "$(shasum -a 256 "models/$file" | cut -d' ' -f1)" == "$expected" ]]; then
    echo "✓ $file already here ($licence)"
    continue
  fi
  echo "↓ $file from $repo ($licence)"
  curl -fL --progress-bar -o "models/$file.part" "https://huggingface.co/$repo/resolve/main/$file"
  actual=$(shasum -a 256 "models/$file.part" | cut -d' ' -f1)
  if [[ "$actual" != "$expected" ]]; then
    echo "✗ $file: checksum doesn't match Hugging Face's; deleted" >&2
    rm -f "models/$file.part"
    exit 1
  fi
  mv "models/$file.part" "models/$file"
  echo "✓ $file checksum OK"
done
