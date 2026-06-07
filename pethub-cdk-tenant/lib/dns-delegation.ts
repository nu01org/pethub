import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as route53 from 'aws-cdk-lib/aws-route53';

import {
  Settings,
  getEnv,
} from './settings';

export interface TenantDnsDelegationStackProps
  extends cdk.StackProps {
  readonly tenantHostedZone: route53.PublicHostedZone;
}

export class TenantDnsDelegationStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: TenantDnsDelegationStackProps,
  ) {
    super(
      scope,
      id,
      props,
    );

    const tenantId = getEnv(
      Settings.PH_TENANT_ID,
    );

    const parentZoneId = getEnv(
      Settings.PH_PARENT_ZONE_ID,
    );

    const parentDomainName = getEnv(
      Settings.PH_PARENT_DOMAIN_NAME,
    );

    const parentZone =
      route53.HostedZone.fromHostedZoneAttributes(
        this,
        'ParentHostedZone',
        {
          hostedZoneId:
            parentZoneId,

          zoneName:
            parentDomainName,
        },
      );

    const nameServers =
      props.tenantHostedZone
        .hostedZoneNameServers;

    if (!nameServers) {
      throw new Error(
        `Hosted zone ${props.tenantHostedZone.zoneName} does not expose name servers`,
      );
    }

    new route53.NsRecord(
      this,
      'TenantZoneDelegation',
      {
        zone: parentZone,

        recordName:
          tenantId,

        values:
          nameServers,

        ttl:
          cdk.Duration.minutes(
            30,
          ),
      },
    );

    new cdk.CfnOutput(
      this,
      'DelegatedDomain',
      {
        value:
          props.tenantHostedZone
            .zoneName,
      },
    );

    new cdk.CfnOutput(
      this,
      'NameServers',
      {
        value:
          cdk.Fn.join(
            ',',
            nameServers,
          ),
      },
    );
  }
}