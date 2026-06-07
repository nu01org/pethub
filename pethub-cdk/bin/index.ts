#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';

import { NetStack } from '../lib/net-stack';
import { DbStack } from '../lib/db-stack';
import { ParamsStack } from '../lib/params-stack';

import { TenantDnsStack } from '../lib/dns-zone';
import { TenantCertificateStack } from '../lib/acm-cert';
import { getEnv, Settings } from '../lib/settings';

// import { TenantDnsDelegationStack } from '../lib/dns-delegation';
// import { DistributionStack } from '../lib_todo/distribution-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

var stackPrefix = getEnv(Settings.PH_STACK_NAME_PREFIX) || "PH1";

// ── Tier 0: Parameters ────────────────────────────────────────────────────────

new ParamsStack(
  app,
  `${stackPrefix}ParamsStack`,
  {
    env,
  },
);

// ── Tier 1: Tenant DNS Zone ───────────────────────────────────────────────────

const tenantDnsStack =
  new TenantDnsStack(
    app,
    `${stackPrefix}TenantDnsStack`,
    {
      env,
    },
  );

// ── Tier 2: ACM Certificate ───────────────────────────────────────────────────

const certStack =
  new TenantCertificateStack(
    app,
    `${stackPrefix}TenantCertStack`,
    {
      env,
      hostedZoneId:
        tenantDnsStack.tenantHostedZone
          .hostedZoneId,
    },
  );

certStack.addDependency(
  tenantDnsStack,
);

// ── Tier 3: Networking ────────────────────────────────────────────────────────

const netStack =
  new NetStack(
    app,
    `${stackPrefix}NetStack`,
    {
      env,
    },
  );

// ── Tier 4: Database ──────────────────────────────────────────────────────────

new DbStack(
  app,
  `${stackPrefix}DbStack`,
  {
    env,
    vpc: netStack.vpc,
    dbSecurityGroup:
      netStack.dbSecurityGroup,
  },
);


// ── Tier 7: CloudFront (future) ───────────────────────────────────────────────

/*
new DistributionStack(
  app,
  'PHDistributionStack',
  {
    env: {
      account: env.account,
      region: 'us-east-1',
    },
    alb: ecsStack.alb,
  },
);
*/