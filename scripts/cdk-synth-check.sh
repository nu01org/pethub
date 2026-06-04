#!/bin/bash
set -e
cd /home/vscode/src/nu01/pethub
source .envrc
cd pethub-cdk
echo "=== Synth PethubEcsStack ==="
npx cdk synth PethubEcsStack > /tmp/ecs-template.json 2>&1
echo "Exit: $?"
echo ""
echo "=== DATABASE_URL injection ==="
grep -A3 "DATABASE_URL" /tmp/ecs-template.json || echo "NOT FOUND"
echo ""
echo "=== SSM valueFrom references ==="
grep "valueFrom" /tmp/ecs-template.json | head -5 || echo "NOT FOUND"
echo ""
echo "=== Last synth lines ==="
tail -5 /tmp/ecs-template.json
