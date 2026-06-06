import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { getParameter } from './cdk-utils';
export interface EcsStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly imageUri: string;
  readonly containerPort?: number;
  readonly cpu?: number;
  readonly memoryMiB?: number;
  readonly desiredCount?: number;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      vpc,
      imageUri,
      containerPort = 3000,
      cpu = 512,
      memoryMiB = 1024,
      desiredCount = 1,
    } = props;

    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DbCredentials',
      '/pethub/db/credentials'
    );

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });

    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    dbSecret.grantRead(taskRole);
    dbSecret.grantRead(executionRole);

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu,
      memoryLimitMiB: memoryMiB,
      executionRole,
      taskRole,
    });

    //TODO: Avoid passing credentials trough CDK environment variables. Instead, use secrets or SSM parameters directly in the container definition.

    const databaseUrl = cdk.Fn.join('', [
      'postgresql://',
      dbSecret.secretValueFromJson('username').unsafeUnwrap(),
      ':',
      dbSecret.secretValueFromJson('password').unsafeUnwrap(),
      '@',
      dbSecret.secretValueFromJson('host').unsafeUnwrap(),
      ':',
      dbSecret.secretValueFromJson('port').unsafeUnwrap(),
      '/',
      dbSecret.secretValueFromJson('dbname').unsafeUnwrap(),
    ]);

    const betterAuthSecret = getParameter(this, 'BETTER_AUTH_SECRET');

    taskDef.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry(imageUri),

      portMappings: [
        {
          containerPort,
        },
      ],

      environment: {
        PORT: String(containerPort),
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://pethub.daws25.com',
        BETTER_AUTH_SECRET: betterAuthSecret,
        DATABASE_URL: databaseUrl,
      },

      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'pethub-web',
      }),
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const listener = alb.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount,
      assignPublicIp: true,

      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },

      circuitBreaker: {
        rollback: true,
      },
    });

    listener.addTargets('WebTargets', {
      port: containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],

      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
      },
    });

    new cdk.CfnOutput(this, 'AlbDns', {
      value: alb.loadBalancerDnsName,
    });
  }
}