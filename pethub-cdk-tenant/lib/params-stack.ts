import * as cdk from 'aws-cdk-lib/core';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { setEnvParameter } from './cdk-utils';

export class ParamsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    setEnvParameter(this, "BETTER_AUTH_SECRET")
  }


}