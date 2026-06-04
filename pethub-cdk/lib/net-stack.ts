import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetStackProps extends cdk.StackProps {
  /**
   * Maximum number of availability zones to use.
   * @default 2
   */
  readonly maxAzs?: number;

  /**
   * Number of NAT gateways. Required when workloads in private subnets need
   * outbound internet access (e.g. ECS Fargate pulling images from a public
   * registry).
   * @default 1
   */
  readonly natGateways?: number;
}

export class NetStack extends cdk.Stack {
  /** The VPC shared across all tiers. */
  public readonly vpc: ec2.Vpc;

  /** Security group that allows inbound PostgreSQL (5432) from within the VPC. */
  public readonly dbSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetStackProps = {}) {
    super(scope, id, props);

    const { maxAzs = 2, natGateways = 1 } = props;

    // ── VPC ───────────────────────────────────────────────────────────────────
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs,
      natGateways,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          // ECS Fargate tasks live here; they reach the internet via NAT.
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          // Aurora lives here — no route to the internet.
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // ── DB security group ─────────────────────────────────────────────────────
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: this.vpc,
      description: 'Allow PostgreSQL access from within the VPC',
      allowAllOutbound: false,
    });

    this.dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'PostgreSQL from within VPC',
    );

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${this.stackName}-VpcId`,
    });

    new cdk.CfnOutput(this, 'DbSecurityGroupId', {
      value: this.dbSecurityGroup.securityGroupId,
      description: 'DB security group ID',
      exportName: `${this.stackName}-DbSecurityGroupId`,
    });
  }
}
