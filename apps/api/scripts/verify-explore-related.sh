#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SPOT_ID="${SPOT_ID:-1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

printf "\n[1/6] spot detail\n"
curl -sS "${API_BASE_URL}/dive-spots/${SPOT_ID}" | jq '{status, message, spot: .data | {id, name, locationName}}'

printf "\n[2/6] reviews list\n"
curl -sS "${API_BASE_URL}/dive-spots/${SPOT_ID}/reviews?limit=5&offset=0" | jq '{status, count: (.data | length), sample: .data[0]}'

printf "\n[3/6] reviews summary\n"
curl -sS "${API_BASE_URL}/dive-spots/${SPOT_ID}/reviews/summary" | jq '{status, data}'

printf "\n[4/6] related events\n"
curl -sS "${API_BASE_URL}/events?diveSpotId=${SPOT_ID}&limit=5&offset=0" | jq '{status, count: (.data | length)}'

printf "\n[5/6] related records\n"
curl -sS "${API_BASE_URL}/records?diveSpotId=${SPOT_ID}&limit=5&offset=0" | jq '{status, count: (.data | length)}'

printf "\n[6/6] related buddies (requires auth token)\n"
if [[ -z "${AUTH_TOKEN}" ]]; then
  printf "AUTH_TOKEN not provided, skipping buddies check.\n"
else
  curl -sS -H "Authorization: Bearer ${AUTH_TOKEN}" "${API_BASE_URL}/buddies/available?diveSpotId=${SPOT_ID}&limit=5&offset=0" | jq '{status, count: (.data | length)}'
fi
