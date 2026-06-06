import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

const PH_TENANT_ID = process.env.PH_TENANT_ID ?? 'pethub-dev';

/**
 * Creates an SSM StringParameter 
 */
export function setParameter(
  scope: Construct,
  paramId: string,
  paramValue: string
): ssm.StringParameter {
    const paramName = `/${PH_TENANT_ID}/${paramId}`;
    const param = new ssm.StringParameter(scope, paramId, {
        parameterName: paramName,
        stringValue: paramValue,
        description: `Parameter ${paramId}`,
    });
    return param;
}

export function setEnvParameter(scope: Construct, envVarName: string){
    const envVarValue:string = ''+process.env[envVarName];
    if ( envVarValue == ''){
        throw new Error(`Environment variable ${envVarName} is not set`);

    }
    setParameter(
      scope,
      envVarName,
      envVarValue
    );
}

export function getParameter(
  scope: Construct,
  paramId: string
): string {
  const paramName = `/${PH_TENANT_ID}/${paramId}`;

  return ssm.StringParameter.valueForStringParameter(
    scope,
    paramName
  );
}