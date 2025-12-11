#!/bin/sh

DT_AGENT="/opt/dynatrace/oneagent/dynatrace-agent64.sh"
LIBERTY_CMD="/opt/ol/wlp/bin/server run defaultServer"

# If Dynatrace agent script is present
if [ -f "$DT_AGENT" ]; then
  echo ">>> Dynatrace agent detected – starting Liberty WITH OneAgent..."
  exec /bin/sh "$DT_AGENT" $LIBERTY_CMD
else
  echo ">>> Dynatrace agent NOT found – starting Liberty without OneAgent..."
  exec $LIBERTY_CMD
fi