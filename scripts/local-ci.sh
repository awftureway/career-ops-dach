#!/usr/bin/env bash
# Local replacement for the disabled GitHub "Tests" and "Web CI" workflows.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run lint
node test-all.mjs --quick
cd web
npm test
npx tsc --noEmit
npm run build
