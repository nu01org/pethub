#!/bin/bash
export AWS_DEFAULT_REGION=us-east-1

echo "=== Log groups under /pethub ==="
aws logs describe-log-groups \
  --log-group-name-prefix /pethub \
  --query 'logGroups[*].logGroupName' \
  --output text

echo ""
echo "=== Most recent log stream in /pethub/web ==="
STREAM=$(aws logs describe-log-streams \
  --log-group-name /pethub/web \
  --order-by LastEventTime \
  --descending \
  --limit 1 \
  --query 'logStreams[0].logStreamName' \
  --output text 2>/dev/null)

echo "Stream: $STREAM"

echo ""
echo "=== Last 100 log events ==="
aws logs get-log-events \
  --log-group-name /pethub/web \
  --log-stream-name "$STREAM" \
  --limit 100 \
  --start-from-head \
  --query 'events[*].message' \
  --output text 2>&1
