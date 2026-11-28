#!/bin/sh
# Ghostex starts the server with its own PATH, which misses some Node installs (nvm, Herd, fnm, Volta).
# Use node from PATH when there is one, else the newest one in the usual places.
dir=$(dirname "$0")
node_bin=$(command -v node)
if [ -z "$node_bin" ]; then
  for n in "$HOME"/.nvm/versions/node/*/bin/node \
           "$HOME/Library/Application Support/Herd/config/nvm/versions/node/"*/bin/node \
           "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node \
           "$HOME"/.volta/bin/node /opt/homebrew/bin/node /usr/local/bin/node; do
    [ -x "$n" ] && node_bin="$n"
  done
fi
if [ -z "$node_bin" ]; then
  echo "Mobile Pane needs Node.js 22 or newer; none was found on PATH or in nvm, Herd, fnm, Volta or Homebrew." >&2
  exit 127
fi
exec "$node_bin" "$dir/server.mjs" "$@"
