#!/bin/sh
# assets/card.{js,wasm} を再ビルドするスクリプト。
# 実行例: sh wasm-src/build.sh
set -e
cd "$(dirname "$0")/.."

export EMSDK_PYTHON=/opt/homebrew/opt/python@3.14/bin/python3.14
export EM_LLVM_ROOT=/opt/homebrew/Cellar/emscripten/6.0.2/libexec/llvm/bin
export EM_BINARYEN_ROOT=/opt/homebrew/Cellar/emscripten/6.0.2/libexec/binaryen
export EM_NODE_JS=/opt/homebrew/bin/node

emcc wasm-src/card.cpp -O2 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=CardModule \
  -s EXPORTED_FUNCTIONS="['_get_link_url','_get_link_label','_get_link_name','_get_qr_asset','_current_job_title','_next_job_title','_check_konami','_check_secret_word','_msg_context_menu','_msg_caught','_msg_secret_word','_msg_party','_msg_found','_msg_tab_away','_msg_console_title','_msg_console_body','_msg_console_hint','_malloc','_free']" \
  -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','UTF8ToString','stringToUTF8','lengthBytesUTF8']" \
  -s ENVIRONMENT=web \
  -o assets/card.js

# Chrome の TextDecoder が wasm メモリ由来の resizable ArrayBuffer を拒否するバグの回避策。
# (min==max ページでも V8 は resizable ArrayBuffer を返すため、コピーしてから decode させる)
sed -i '' 's/UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))/UTF8Decoder.decode(new Uint8Array(heapOrArray.subarray(idx,endPtr)))/' assets/card.js

echo "Built assets/card.js + assets/card.wasm"
