#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SPOT_ID="${SPOT_ID:-1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

if [[ -z "${AUTH_TOKEN}" ]]; then
  echo "AUTH_TOKEN is required for full flow verification"
  exit 1
fi

echo "[flow] loading initial summary"
INITIAL_SUMMARY="$(curl -sS "${API_BASE_URL}/dive-spots/${SPOT_ID}/reviews/summary")"
INITIAL_COUNT="$(echo "${INITIAL_SUMMARY}" | jq -r '.data.ratingCount // 0')"

echo "[flow] posting/updating review"
COMMENT="flow-check-$(date +%s)"
POST_RES="$(curl -sS -X POST "${API_BASE_URL}/dive-spots/${SPOT_ID}/reviews" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"rating\":5,\"comment\":\"${COMMENT}\"}")"

echo "${POST_RES}" | jq '{status, message, data: {id, diveSpotId, rating, comment}}'

echo "[flow] validating summary and review list"
UPDATED_SUMMARY="$(curl -sS "${API_BASE_URL}/dive-spots/${SPOT_ID}/reviews/summary")"
UPDATED_COUNT="$(echo "${UPDATED_SUMMARY}" | jq -r '.data.ratingCount // 0')"

if [[ "${UPDATED_COUNT}" -lt "${INITIAL_COUNT}" ]]; then
  echo "ratingCount regressed: ${INITIAL_COUNT} -> ${UPDATED_COUNT}"
  exit 1
fi

curl -sS "${API_BASE_URL}/dive-spots/${SPOT_ID}/reviews?limit=20&offset=0" | jq '{status, count: (.data | length)}'

curl -sS "${API_BASE_URL}/events?diveSpotId=${SPOT_ID}&limit=5&offset=0" | jq '{status, events: (.data | length)}'
curl -sS -H "Authorization: Bearer ${AUTH_TOKEN}" "${API_BASE_URL}/buddies/available?diveSpotId=${SPOT_ID}&limit=5&offset=0" | jq '{status, buddies: (.data | length)}'
curl -sS "${API_BASE_URL}/records?diveSpotId=${SPOT_ID}&limit=5&offset=0" | jq '{status, records: (.data | length)}'

echo "[flow] explore flow verification passed"
