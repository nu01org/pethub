import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { getEnv, Settings } from './settings';
import { setParameter } from './cdk-utils';

export interface TenantCertificateStackProps extends cdk.StackProps {
  hostedZoneId: string;
}

export class TenantCertificateStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;

  constructor(
    scope: Construct,
    id: string,
    props: TenantCertificateStackProps,
  ) {
    super(scope, id, props);


    const tenantId = getEnv(Settings.PH_TENANT_ID);
    const parentDomainName = getEnv(Settings.PH_PARENT_DOMAIN_NAME);

    const domainName = `${tenantId}.${parentDomainName}`;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'TenantHostedZone',
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: domainName,
      },
    );

    this.certificate = new acm.Certificate(
      this,
      'TenantCertificate',
      {
        domainName,
        subjectAlternativeNames: [
          `*.${domainName}`,
        ],
        validation: acm.CertificateValidation.fromDns(
          hostedZone,
        ),
      },
    );

    setParameter(this, 'PH_CERTIFICATE_ARN', this.certificate.certificateArn);
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      exportName: 'TenantCertificateArn',
    });

    new cdk.CfnOutput(this, 'CertificateDomainName', {
      value: domainName,
    });
  }
}