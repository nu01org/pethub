import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as route53 from 'aws-cdk-lib/aws-route53';

import {
  Settings,
  getEnv,
} from './settings';
import { setParameter } from './cdk-utils';

export class TenantDnsStack extends cdk.Stack {
  public readonly tenantHostedZone: route53.PublicHostedZone;
  public readonly domainName: string;

  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

    const tenantId = getEnv(
      Settings.PH_TENANT_ID,
    );

    const parentDomainName = getEnv(
      Settings.PH_PARENT_DOMAIN_NAME,
    );

    this.domainName =
      `${tenantId}.${parentDomainName}`;

    console.log(
      `Creating tenant hosted zone ${this.domainName}`,
    );

    this.tenantHostedZone =
      new route53.PublicHostedZone(
        this,
        'TenantHostedZone',
        {
          zoneName: this.domainName,
        },
      );

    setParameter(this, 'PH_TENANT_HOSTED_ZONE_ID', this.tenantHostedZone.hostedZoneId);
    new cdk.CfnOutput(
      this,
      'TenantHostedZoneId',
      {
        value:
          this.tenantHostedZone
            .hostedZoneId,
      },
    );

    new cdk.CfnOutput(
      this,
      'TenantHostedZoneName',
      {
        value: this.domainName,
      },
    );
  }
}