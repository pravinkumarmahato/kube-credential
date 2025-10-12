#!/bin/sh
# Generate a small JS file exposing selected env vars to the browser as window.__ENV
# This allows injecting runtime configuration into a pre-built single-page app.
set -e
# Use an unquoted heredoc so shell variables are expanded into the generated file.
cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV = {
  VITE_ISSUE_API: "${VITE_ISSUE_API}",
  VITE_VERIFY_API: "${VITE_VERIFY_API}",
  VITE_ISSUE_API_KEY: "${VITE_ISSUE_API_KEY}",
  VITE_VERIFY_API_KEY: "${VITE_VERIFY_API_KEY}"
};
EOF

# Exec the container's CMD
exec "$@"
