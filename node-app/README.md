#!/bin/sh
set -e

DT_AGENT="/opt/dynatrace/oneagent/dynatrace-agent64.sh"

LIBERTY_BIN="/opt/ol/wlp/bin/server"
LIBERTY_ARGS="run defaultServer"

# If Dynatrace OneAgent script is present
if [ -f "$DT_AGENT" ]; then
  echo ">>> Dynatrace agent detected – starting Liberty WITH OneAgent..."
  exec /bin/sh "$DT_AGENT" "$LIBERTY_BIN" $LIBERTY_ARGS
else
  echo ">>> Dynatrace agent NOT found – starting Liberty without OneAgent..."
  exec "$LIBERTY_BIN" $LIBERTY_ARGS
fi