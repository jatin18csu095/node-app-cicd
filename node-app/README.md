#!/bin/sh
set -e

DT_AGENT="/opt/dynatrace/oneagent/dynatrace-agent64.sh"
LIBERTY_BIN="/opt/ol/wlp/bin/server"

if [ -f "$DT_AGENT" ]; then
  echo ">>> Dynatrace OneAgent detected - starting Liberty with OneAgent"
  exec /bin/sh "$DT_AGENT" "$LIBERTY_BIN" run defaultServer
else
  echo ">>> Dynatrace OneAgent NOT found - starting Liberty without OneAgent"
  exec "$LIBERTY_BIN" run defaultServer
fi