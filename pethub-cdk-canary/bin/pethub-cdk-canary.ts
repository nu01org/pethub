#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { EcsStack } from '../lib/ecs-stack';
import { getEnv, Settings } from '../lib/settings';
import { ECSALBAliasStack } from '../lib/ecs-alb-alias';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// -- Tier 0: Parameters
const parentZoneId = getEnv(Settings.PH_PARENT_ZONE_ID); 
const parentDomainName = getEnv(Settings.PH_PARENT_DOMAIN_NAME); 

// ── Tier 3: application (ECS Fargate + ALB) ───────────────────────────────────
const imageUri = process.env.PETHUB_IMAGE_URI ??
        `${process.env.REGISTRY_USERNAME ?? 'jfaerman'}/pethub-web:latest`;
console.log("Using image uri: "+imageUri);
const ecsStack = new EcsStack(app, 'PHEcsStack', {
  env,
  imageUri
  // containerPort: 3000,
  // cpu:           512,
  // memoryMiB:     1024,
  // desiredCount:  1,
});
