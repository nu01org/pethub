import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface DbStackProps extends cdk.StackProps {
  /** VPC in which to place the Aurora cluster. */
  readonly vpc: ec2.IVpc;

  /** Security group to attach to the cluster instances. */
  readonly dbSecurityGroup: ec2.ISecurityGroup;

  /**
   * Name of the default database created inside the cluster.
   * @default 'pethub'
   */
  readonly databaseName?: string;

  /**
   * Minimum Aurora Serverless v3 capacity (ACUs).
   * @default 0.5
   */
  readonly minCapacity?: number;

  /**
   * Maximum Aurora Serverless v3 capacity (ACUs).
   * @default 4
   */
  readonly maxCapacity?: number;

  /**
   * SSM parameter path where the connection URL is stored.
   * @default '/pethub/db/url'
   */
  readonly ssmParameterPath?: string;
}

export class DbStack extends cdk.Stack {
  /** The Aurora Serverless v3 cluster. */
  public readonly cluster: rds.DatabaseCluster;

  /** SSM parameter holding the database connection URL. */
  public readonly dbUrlParameter: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: DbStackProps) {
    super(scope, id, props);

    const {
      vpc,
      dbSecurityGroup,
      databaseName = 'pethub',
      minCapacity = 0.0,
      maxCapacity = 8,
      ssmParameterPath = '/pethub/db/url',
    } = props;

    // ── Aurora Serverless v3 cluster ──────────────────────────────────────────
    // "Serverless v3" in CDK terms means a standard DatabaseCluster whose
    // instances are typed ClusterInstance.serverlessV2().
    this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_6,
      }),
      serverlessV2MinCapacity: minCapacity,
      serverlessV2MaxCapacity: maxCapacity,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      defaultDatabaseName: databaseName,
      credentials: rds.Credentials.fromGeneratedSecret('pethubadmin', {
        secretName: '/pethub/db/credentials',
      }),
      storageEncrypted: true,
      deletionProtection: false, // flip to true for production
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // ── Database URL → SSM ────────────────────────────────────────────────────
    // Build a postgresql:// URL by joining CloudFormation tokens.  The secret
    // values are resolved at deploy time; they never appear in CF outputs.
    const dbUrl = cdk.Fn.join('', [
      'postgresql://',
      this.cluster.secret!.secretValueFromJson('username').unsafeUnwrap(),
      ':',
      this.cluster.secret!.secretValueFromJson('password').unsafeUnwrap(),
      '@',
      this.cluster.clusterEndpoint.hostname,
      ':',
      cdk.Token.asString(this.cluster.clusterEndpoint.port),
      '/',
      databaseName,
    ]);

    this.dbUrlParameter = new ssm.StringParameter(this, 'DbUrlParameter', {
      parameterName: ssmParameterPath,
      stringValue: dbUrl,
      description: 'Aurora Serverless v3 PostgreSQL connection URL for PetHub',
      tier: ssm.ParameterTier.STANDARD,
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      description: 'Aurora cluster writer endpoint hostname',
      exportName: `${this.stackName}-ClusterEndpoint`,
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.cluster.secret!.secretArn,
      description: 'Secrets Manager ARN for DB credentials',
      exportName: `${this.stackName}-DbSecretArn`,
    });

    new cdk.CfnOutput(this, 'DbUrlParameterName', {
      value: this.dbUrlParameter.parameterName,
      description: 'SSM parameter name for the database URL',
      exportName: `${this.stackName}-DbUrlParameterName`,
    });
  }
}
