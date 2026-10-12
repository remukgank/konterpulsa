#!/bin/bash
mkdir -p "$HOME/workspace/.9router"
ln -sfn "$HOME/workspace/.9router" "$HOME/.9router"
npm i -g 9router@latest --registry=https://registry.npmjs.org --silent 2>&1 | tail -n 3 || true

# npm publish can omit sql.js' adjacent WASM asset from the bundled app
# (sql-wasm.js resolves it relative to its own dist/ directory). The 9router
# runtime copy is installed by the package's postinstall hook, so restore the
# missing asset before starting the dashboard.
GLOBAL_ROOT="$(npm root -g)"
ROUTER_ROOT="$GLOBAL_ROOT/9router"
WASM_TARGET="$ROUTER_ROOT/app/node_modules/sql.js/dist/sql-wasm.wasm"
if [[ ! -s "$WASM_TARGET" ]]; then
  for WASM_SOURCE in \
    "$HOME/.9router/runtime/node_modules/sql.js/dist/sql-wasm.wasm" \
    "$GLOBAL_ROOT/sql.js/dist/sql-wasm.wasm"; do
    if [[ -s "$WASM_SOURCE" ]]; then
      mkdir -p "$(dirname "$WASM_TARGET")"
      cp "$WASM_SOURCE" "$WASM_TARGET"
      echo "[start.sh] Restored sql.js WASM asset for 9router"
      break
    fi
  done
fi

unset DISPLAY
exec 9router -n -l