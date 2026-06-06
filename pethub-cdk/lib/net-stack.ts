import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface NetStackProps extends cdk.StackProps {
  readonly maxAzs?: number;
}

export class NetStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetStackProps = {}) {
    super(scope, id, props);

    const { maxAzs = 3 } = props;

    //
    // VPC
    //
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs,

      natGateways: 0,

      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'application',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    //
    // Endpoint security group
    //
    const endpointSecurityGroup = new ec2.SecurityGroup(
      this,
      'VpcEndpointSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Security group for VPC endpoints',
        allowAllOutbound: true,
      }
    );

    endpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Allow HTTPS from VPC'
    );

    //
    // Required for ECR image pulls
    //
    this.vpc.addInterfaceEndpoint('EcrApiEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true,
    });

    this.vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true,
    });

    //
    // Required because ECR layers are stored in S3
    //
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    //
    // Required for awslogs driver
    //
    this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true,
    });

    //
    // Required for ECS secrets
    //
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true,
    });

    //
    // ECS control plane endpoints
    //
    this.vpc.addInterfaceEndpoint('EcsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECS,
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true,
    });

    this.vpc.addInterfaceEndpoint('EcsAgentEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECS_AGENT,
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true,
    });

    this.vpc.addInterfaceEndpoint('EcsTelemetryEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true,
    });

    //
    // DB security group
    //
    this.dbSecurityGroup = new ec2.SecurityGroup(
      this,
      'DbSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Allow PostgreSQL access from within the VPC',
        allowAllOutbound: false,
      }
    );

    this.dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'PostgreSQL from within VPC'
    );

    //
    // SSM
    //
    new ssm.StringParameter(this, 'VpcIdParameter', {
      parameterName: `/net/${this.stackName}/vpc-id`,
      stringValue: this.vpc.vpcId,
      description: 'VPC ID for networking stack',
    });

    //
    // Outputs
    //
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