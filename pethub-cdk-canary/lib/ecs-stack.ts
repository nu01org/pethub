import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { getParameter } from './cdk-utils';
import {
  Settings,
  getEnvBool,
  getEnvNumber,
  getTenantDomain,
} from './settings';

export interface EcsStackProps extends cdk.StackProps {
  readonly imageUri: string;

  readonly containerPort?: number;
  readonly cpu?: number;
  readonly memoryMiB?: number;
  readonly desiredCount?: number;
}

export class EcsStack extends cdk.Stack {
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      imageUri,
      containerPort = getEnvNumber(Settings.PH_WEB_CONTAINER_PORT),
      cpu = getEnvNumber(Settings.PH_WEB_CPU),
      memoryMiB = getEnvNumber(Settings.PH_WEB_MEMORY_MIB),
      desiredCount = getEnvNumber(Settings.PH_WEB_DESIRED_COUNT),
    } = props;

    const enableHttp = getEnvBool(Settings.PH_LISTEN_HTTP);
    const enableHttps = getEnvBool(Settings.PH_LISTEN_HTTPS);

    if (!enableHttp && !enableHttps) {
      throw new Error('At least one of HTTP or HTTPS must be enabled');
    }

    const vpc = this.loadVpc();
    const dbSecret = this.getDatabaseSecret();

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const executionRole = this.createExecutionRole();
    const taskRole = this.createTaskRole();

    const taskDef = this.createTaskDefinition(cpu, memoryMiB, executionRole, taskRole);

    this.addWebContainer(taskDef, imageUri, containerPort, dbSecret);

    this.alb = this.createAlb(vpc);

    const service = this.createService(cluster, taskDef, desiredCount);

    const listener = enableHttps
      ? this.createHttpsListener(this.alb, enableHttp)
      : this.createHttpListener(this.alb);

    this.attachTargets(listener, service, containerPort);

    this.createOutputs(this.alb);
  }

  // -------------------------
  // VPC (FIXED)
  // -------------------------
  private loadVpc(): ec2.IVpc {
    const vpcId = getParameter(this, 'VPC_ID');

    const publicSubnetIds = getParameter(
      this,
      'PUBLIC_SUBNET_IDS',
    ).split(',');

    const privateSubnetIds = getParameter(
      this,
      'PRIVATE_SUBNET_IDS',
    ).split(',');

    const azs = getParameter(
      this,
      'AVAILABILITY_ZONES',
    ).split(',');

    if (publicSubnetIds.length !== azs.length) {
      throw new Error(
        `PUBLIC_SUBNET_IDS (${publicSubnetIds.length}) must match AZ count (${azs.length})`,
      );
    }

    if (privateSubnetIds.length !== azs.length) {
      throw new Error(
        `PRIVATE_SUBNET_IDS (${privateSubnetIds.length}) must match AZ count (${azs.length})`,
      );
    }

    return ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId,

      availabilityZones: azs,

      publicSubnetIds,
      privateSubnetIds,
    });
  }

  // -------------------------
  // Secrets
  // -------------------------
  private getDatabaseSecret(): secretsmanager.ISecret {
    return secretsmanager.Secret.fromSecretNameV2(
      this,
      'DbCredentials',
      '/pethub/db/credentials',
    );
  }

  // -------------------------
  // Roles
  // -------------------------
  private createExecutionRole(): iam.Role {
    return new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy',
        ),
      ],
    });
  }

  private createTaskRole(): iam.Role {
    return new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
  }

  // -------------------------
  // Task Definition
  // -------------------------
  private createTaskDefinition(
    cpu: number,
    memoryMiB: number,
    executionRole: iam.IRole,
    taskRole: iam.IRole,
  ): ecs.FargateTaskDefinition {
    return new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu,
      memoryLimitMiB: memoryMiB,
      executionRole,
      taskRole,
    });
  }

  // -------------------------
  // Container
  // -------------------------
  private addWebContainer(
    taskDef: ecs.FargateTaskDefinition,
    imageUri: string,
    containerPort: number,
    dbSecret: secretsmanager.ISecret,
  ): void {
    const dbUrl = cdk.Fn.join('', [
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

      portMappings: [{ containerPort }],

      environment: {
        PORT: String(containerPort),
        NODE_ENV: 'production',
        BETTER_AUTH_URL: `https://${getTenantDomain()}`,
        BETTER_AUTH_SECRET: betterAuthSecret,
        DATABASE_URL: dbUrl,
      },

      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'pethub-web',
      }),
    });
  }

  // -------------------------
  // ALB
  // -------------------------
  private createAlb(vpc: ec2.IVpc): elbv2.ApplicationLoadBalancer {
    return new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });
  }

  // -------------------------
  // ECS Service
  // -------------------------
  private createService(
    cluster: ecs.Cluster,
    taskDef: ecs.FargateTaskDefinition,
    desiredCount: number,
  ): ecs.FargateService {
    return new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      circuitBreaker: { rollback: true },
    });
  }

  // -------------------------
  // Listeners
  // -------------------------
  private createHttpListener(alb: elbv2.ApplicationLoadBalancer) {
    return alb.addListener('HttpListener', {
      port: 80,
      open: true,
    });
  }

  private createHttpsListener(
    alb: elbv2.ApplicationLoadBalancer,
    redirectHttp: boolean,
  ) {
    const listener = alb.addListener('HttpsListener', {
      port: 443,
      open: true,
      certificates: [this.getCertificate()],
    });

    if (redirectHttp) {
      alb.addListener('HttpRedirect', {
        port: 80,
        open: true,
        defaultAction: elbv2.ListenerAction.redirect({
          protocol: 'HTTPS',
          port: '443',
          permanent: true,
        }),
      });
    }

    return listener;
  }

  // -------------------------
  // Certificate
  // -------------------------
  private getCertificate(): acm.ICertificate {
    const arn = getParameter(this, 'PH_CERTIFICATE_ARN');

    return acm.Certificate.fromCertificateArn(this, 'Cert', arn);
  }

  // -------------------------
  // Target binding
  // -------------------------
  private attachTargets(
    listener: elbv2.ApplicationListener,
    service: ecs.FargateService,
    containerPort: number,
  ): void {
    listener.addTargets('WebTargets', {
      port: containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
      },
    });
  }

  // -------------------------
  // Outputs
  // -------------------------
  private createOutputs(alb: elbv2.ApplicationLoadBalancer): void {
    new cdk.CfnOutput(this, 'AlbDns', {
      value: alb.loadBalancerDnsName,
    });
  }
}