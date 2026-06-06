#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { NetStack } from '../lib/net-stack';
import { DbStack } from '../lib/db-stack';
import { EcsStack } from '../lib/ecs-stack';
import { ParamsStack } from '../lib/params-stack';

//import { DistributionStack } from '../lib_todo/distribution-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// -- Tier 0: Parameters
const paramsStack = new ParamsStack(app, 'PethubParamsStack', {})

// ── Tier 1: networking ────────────────────────────────────────────────────────
const netStack = new NetStack(app, 'PethubNetStack', {
  env,
  // natGateways: 1 (default) keeps Fargate tasks able to pull images.
  // Set to 0 only if you switch to a private ECR registry to save cost.
});

// ── Tier 2: database ──────────────────────────────────────────────────────────
const dbStack = new DbStack(app, 'PethubDbStack', {
  env,
  vpc: netStack.vpc,
  dbSecurityGroup: netStack.dbSecurityGroup,
  // databaseName:     'pethub',
  // minCapacity:      0.5,
  // maxCapacity:      4,
  // ssmParameterPath: '/pethub/db/url',
});

// ── Tier 3: application (ECS Fargate + ALB) ───────────────────────────────────
const imageUri = process.env.PETHUB_IMAGE_URI ??
        `${process.env.REGISTRY_USERNAME ?? 'jfaerman'}/pethub-web:latest`;
console.log("Using image uri: "+imageUri);
const ecsStack = new EcsStack(app, 'PethubEcsStack', {
  env,
  vpc: netStack.vpc,
  imageUri
  // containerPort: 3000,
  // cpu:           512,
  // memoryMiB:     1024,
  // desiredCount:  1,
});


// ── Tier 4: distribution (CloudFront) ────────────────────────────────────────
// CloudFront is a global service — must be deployed to us-east-1.
/*
new DistributionStack(app, 'PethubDistributionStack', {
  env: { account: env.account, region: 'us-east-1' },
  alb: ecsStack.alb,
  // defaultTtl: cdk.Duration.seconds(0),  // no caching for SSR (default)
});
*/