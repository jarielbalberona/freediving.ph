#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"

printf "\n[1/4] list shape with aggregates\n"
curl -sS "${API_BASE_URL}/dive-spots?limit=5&offset=0&shape=list" | jq '{status, message, count: (.data | length), sample: .data[0] | {id, name, avgRating, ratingCount, commentCount}}'

printf "\n[2/4] map shape minimal payload\n"
curl -sS "${API_BASE_URL}/dive-spots?limit=5&offset=0&shape=map" | jq '{status, message, count: (.data | length), sample: .data[0] | {id, name, lat, lng, locationName, depth, difficulty, imageUrl, avgRating, ratingCount, commentCount}}'

printf "\n[3/4] bounded viewport filter\n"
curl -sS "${API_BASE_URL}/dive-spots?shape=map&north=14&south=5&east=126&west=118&limit=20&offset=0" | jq '{status, count: (.data | length)}'

printf "\n[4/4] invalid bounds should fail validation\n"
HTTP_CODE="$(curl -sS -o /tmp/dive-spot-bounds-error.json -w "%{http_code}" "${API_BASE_URL}/dive-spots?north=2&south=8")"
printf "http_status=%s\n" "${HTTP_CODE}"
cat /tmp/dive-spot-bounds-error.json | jq '{status, message, errors}'
