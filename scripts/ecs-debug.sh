#!/bin/bash
export AWS_DEFAULT_REGION=us-east-1

echo "=== All ECS clusters ==="
aws ecs list-clusters --output text

# Pick the pethub cluster
CLUSTER=$(aws ecs list-clusters --output text | tr '\t' '\n' | grep -i pethub | head -1)
echo "Cluster: $CLUSTER"

echo ""
echo "=== Last 5 stopped tasks ==="
TASKS=$(aws ecs list-tasks \
  --cluster "$CLUSTER" \
  --desired-status STOPPED \
  --output text \
  --query 'taskArns[:5]')
echo "Tasks: $TASKS"

if [ -n "$TASKS" ]; then
  aws ecs describe-tasks \
    --cluster "$CLUSTER" \
    --tasks $TASKS \
    --query 'tasks[*].{StoppedReason:stoppedReason,StopCode:stopCode,Containers:containers[*].{Name:name,ExitCode:exitCode,Reason:reason}}' \
    --output json
fi

echo ""
echo "=== CloudWatch logs (last 50 lines from /pethub/web) ==="
LOG_STREAM=$(aws logs describe-log-streams \
  --log-group-name /pethub/web \
  --order-by LastEventTime \
  --descending \
  --query 'logStreams[0].logStreamName' \
  --output text 2>/dev/null || echo "")

if [ -n "$LOG_STREAM" ] && [ "$LOG_STREAM" != "None" ]; then
  echo "Stream: $LOG_STREAM"
  aws logs get-log-events \
    --log-group-name /pethub/web \
    --log-stream-name "$LOG_STREAM" \
    --limit 50 \
    --query 'events[*].message' \
    --output text
else
  echo "No log streams found in /pethub/web — tasks likely failed before logging started."
fi
