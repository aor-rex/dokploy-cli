#!/bin/sh
# curl install:  curl -sSL https://raw.githubusercontent.com/aor-rex/dokploy-cli/main/install.sh | sh
set -e
BASE="https://raw.githubusercontent.com/aor-rex/dokploy-cli/main"
DEST="${DK_DEST:-$HOME/.local/bin}"
mkdir -p "$DEST"
for f in dk.js dk-spec.json; do
  curl -sSL "$BASE/$f" -o "$DEST/$f"
done
chmod +x "$DEST/dk.js"
if [ ! -e "$DEST/dk" ]; then
  printf '#!/bin/sh\nexec node "%s/dk.js" "$@"\n' "$DEST" > "$DEST/dk"
  chmod +x "$DEST/dk"
fi
echo "dk installed to $DEST — needs node 18+ and ~/.local/bin on PATH"
echo "then: dk auth -u https://your-dokploy.host -t <api-token>"
