import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface EcsStackProps extends cdk.StackProps {
  /** VPC from NetStack. */
  readonly vpc: ec2.IVpc;

  /**
   * Full image URI for the pethub-web container.
   * Must be accessible from ECS Fargate (ECR, Docker Hub, or other public registry).
   * Examples:
   *   - ECR:        '123456789012.dkr.ecr.us-east-1.amazonaws.com/pethub-web:latest'
   *   - Docker Hub: 'jfaerman/pethub-web:latest'
   * @default process.env.PETHUB_IMAGE_URI ?? 'jfaerman/pethub-web:latest'
   */
  readonly imageUri?: string;

  /**
   * Container port the application listens on.
   * @default 3000
   */
  readonly containerPort?: number;

  /**
   * SSM StringParameter holding the pre-assembled postgresql:// connection URL
   * produced by DbStack. Its value is injected into the container as DATABASE_URL
   * at task launch time via ECS secrets (resolved by the ECS agent, never stored
   * in the task definition in plaintext).
   */
  readonly dbUrlParameter: ssm.IStringParameter;

  /**
   * Fargate task CPU units (256 | 512 | 1024 | 2048 | 4096).
   * @default 512
   */
  readonly cpu?: number;

  /**
   * Fargate task memory in MiB.
   * @default 1024
   */
  readonly memoryMiB?: number;

  /**
   * Desired number of running tasks.
   * @default 1
   */
  readonly desiredCount?: number;
}

export class EcsStack extends cdk.Stack {
  /** The ECS cluster. */
  public readonly cluster: ecs.Cluster;

  /** The Fargate service. */
  public readonly service: ecs.FargateService;

  /** The Application Load Balancer. */
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      vpc,
      imageUri = process.env.PETHUB_IMAGE_URI ?? `${process.env.REGISTRY_USERNAME ?? 'jfaerman'}/pethub-web:latest`,
      containerPort = 3000,
      dbUrlParameter,
      cpu = 512,
      memoryMiB = 1024,
      desiredCount = 1,
    } = props;

    // ── ECS cluster ───────────────────────────────────────────────────────────
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });
    // ── Task definition ───────────────────────────────────────────────────────
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu,
      memoryLimitMiB: memoryMiB,
    });

    const logGroup = new logs.LogGroup(this, 'AppLogs', {
      logGroupName: '/pethub/web',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── DATABASE_URL via SSM Parameter ───────────────────────────────────────
    // DbStack stores a pre-assembled postgresql:// URL in SSM. We inject it
    // as an ECS secret so the value is resolved by the ECS agent at task
    // launch — it never appears in the task definition JSON in plaintext.
    // Grant the task execution role permission to read the parameter.
    dbUrlParameter.grantRead(taskDef.executionRole!);

    taskDef.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry(imageUri),
      portMappings: [{ containerPort }],
      secrets: {
        DATABASE_URL: ecs.Secret.fromSsmParameter(dbUrlParameter),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'pethub-web',
        logGroup,
      }),
      environment: {
        PORT: String(containerPort),
        NODE_ENV: 'production',
      },
    });

    // ── ALB ───────────────────────────────────────────────────────────────────
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const listener = this.alb.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    // ── Fargate service ───────────────────────────────────────────────────────
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: taskDef,
      desiredCount,
      // Run tasks in the private-with-egress subnets so they can pull images
      // from a public registry via the NAT gateway in NetStack.
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
      // Fail fast if tasks can't start instead of waiting up to 3 hours.
      circuitBreaker: { rollback: true },
      // Keep 100% healthy during rolling deployments (single-task friendly).
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });

    listener.addTargets('WebTarget', {
      port: containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.service],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.alb.loadBalancerDnsName,
      description: 'Public DNS name of the Application Load Balancer',
      exportName: `${this.stackName}-AlbDnsName`,
    });

    new cdk.CfnOutput(this, 'ServiceUrl', {
      value: `http://${this.alb.loadBalancerDnsName}`,
      description: 'pethub-web service URL',
      exportName: `${this.stackName}-ServiceUrl`,
    });
  }
}
