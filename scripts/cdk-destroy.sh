#!/bin/bash
set -e

# Destroy the current deployment using CDK and pethub-cdk module
echo "Destroying PetHub CDK deployment..."

# Navigate to the CDK directory if it exists
if [ -d "pethub-cdk" ]; then
  cd pethub-cdk
fi

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Destroy the CDK stack
echo "Running cdk destroy..."
npx cdk destroy --force

echo "Deployment destroyed successfully."
