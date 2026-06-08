import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

import {
  Settings,
  getEnv,
  getTenantDomain,
} from './settings';

import {
  getParameter,
} from './cdk-utils';

export interface ECSALBAliasStackProps
  extends cdk.StackProps {
  readonly alb: elbv2.IApplicationLoadBalancer;
}

export class ECSALBAliasStack
  extends cdk.Stack {
  public readonly fqdn: string;

  constructor(
    scope: Construct,
    id: string,
    props: ECSALBAliasStackProps,
  ) {
    super(
      scope,
      id,
      props,
    );

    const tenantDomain =
      getTenantDomain();

    const canaryId =
      getEnv(
        Settings.PH_CANARY_ID,
      );

    this.fqdn =
      `${canaryId}.${tenantDomain}`;

    const hostedZoneId =
      getParameter(
        this,
        'PH_TENANT_HOSTED_ZONE_ID',
      );

    const hostedZone =
      route53.HostedZone.fromHostedZoneAttributes(
        this,
        'TenantHostedZone',
        {
          hostedZoneId,

          zoneName:
            tenantDomain,
        },
      );

    new route53.ARecord(
      this,
      'CanaryAliasRecord',
      {
        zone:
          hostedZone,

        recordName:
          canaryId,

        target:
          route53.RecordTarget.fromAlias(
            new route53Targets.LoadBalancerTarget(
              props.alb,
            ),
          ),
      },
    );

    new cdk.CfnOutput(
      this,
      'CanaryUrl',
      {
        value:
          `https://${this.fqdn}`,
      },
    );

    new cdk.CfnOutput(
      this,
      'CanaryFqdn',
      {
        value:
          this.fqdn,
      },
    );
  }
}