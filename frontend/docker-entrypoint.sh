#!/bin/sh
# Generate a small JS file exposing selected env vars to the browser as window.__ENV
# This allows injecting runtime configuration into a pre-built single-page app.
set -e

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV = {
  VITE_ISSUE_API: "http://" + window.location.hostname + ":3000",
  VITE_VERIFY_API: "http://" + window.location.hostname + ":3001",
  VITE_ISSUE_API_KEY: "${VITE_ISSUE_API_KEY}",
  VITE_VERIFY_API_KEY: "${VITE_VERIFY_API_KEY}"
};
EOF

# Exec the container's CMD
exec "$@"
