export enum Settings {
    // Development
    PGDATA = "PGDATA",

    // Build
    PH_SKIP_DOCKER_BUILD = "PH_SKIP_DOCKER_BUILD",
    REGISTRY_USERNAME = "REGISTRY_USERNAME",

    // Deployment
    CDK_DEFAULT_ACCOUNT = "CDK_DEFAULT_ACCOUNT",
    CDK_DEFAULT_REGION = "CDK_DEFAULT_REGION",

    PH_TENANT_ID = "PH_TENANT_ID",
    PH_CANARY_ID = "PH_CANARY_ID",
    PH_STACK_NAME_PREFIX = "PH_STACK_NAME_PREFIX",

    PH_PARENT_ZONE_ID = "PH_PARENT_ZONE_ID",
    PH_PARENT_DOMAIN_NAME = "PH_PARENT_DOMAIN_NAME",

    PH_LISTEN_HTTP = "PH_LISTEN_HTTP",
    PH_LISTEN_HTTPS = "PH_LISTEN_HTTPS",

    // Web
    PH_WEB_CONTAINER_PORT = "PH_WEB_CONTAINER_PORT",
    PH_WEB_CPU = "PH_WEB_CPU",
    PH_WEB_MEMORY_MIB = "PH_WEB_MEMORY_MIB",
    PH_WEB_DESIRED_COUNT = "PH_WEB_DESIRED_COUNT",

    // Database
    DATABASE_URL = "DATABASE_URL",

    // Authentication
    GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID",
    GOOGLE_CLIENT_SECRET = "GOOGLE_CLIENT_SECRET",

    BETTER_AUTH_SECRET = "BETTER_AUTH_SECRET",
    BETTER_AUTH_URL = "BETTER_AUTH_URL",
}

export const DEFAULTS: Partial<Record<Settings, string>> = {
    // Development
    [Settings.PGDATA]: ".pgdata",

    // Build
    [Settings.PH_SKIP_DOCKER_BUILD]: "true",
    [Settings.REGISTRY_USERNAME]: "jfaerman",

    // Deployment
    [Settings.CDK_DEFAULT_ACCOUNT]: "707859598958",
    [Settings.CDK_DEFAULT_REGION]: "us-east-1",

    [Settings.PH_TENANT_ID]: "pethub",
    [Settings.PH_CANARY_ID]: "www",
    [Settings.PH_STACK_NAME_PREFIX]: "PH",

    [Settings.PH_PARENT_ZONE_ID]: "Z03647633PSGP4NGRHD23",
    [Settings.PH_PARENT_DOMAIN_NAME]: "daws25.com",

    [Settings.PH_LISTEN_HTTP]: "false",
    [Settings.PH_LISTEN_HTTPS]: "true",

    // Web
    [Settings.PH_WEB_CONTAINER_PORT]: "3000",
    [Settings.PH_WEB_CPU]: "256",
    [Settings.PH_WEB_MEMORY_MIB]: "512",
    [Settings.PH_WEB_DESIRED_COUNT]: "1",

    // Database
    [Settings.DATABASE_URL]:
        "postgres://root:mysecretpassword@localhost:5432/local",

    // Authentication

    [Settings.BETTER_AUTH_URL]:
        "http://localhost:3000",
};

export function getEnv(setting: Settings): string {
    const value = process.env[setting] ?? DEFAULTS[setting];

    if (value == null || value === "") {
        throw new Error(
            `Environment variable ${setting} is required`,
        );
    }

    return value;
}

export function getEnvBool(
    setting: Settings,
): boolean {
    return getEnv(setting).toLowerCase() === "true";
}

export function getEnvNumber(
    setting: Settings,
): number {
    const value = Number(getEnv(setting));

    if (Number.isNaN(value)) {
        throw new Error(
            `Environment variable ${setting} must be a number`,
        );
    }

    return value;
}

export function getTenantDomain(): string {
    return `${getEnv(Settings.PH_TENANT_ID)}.${getEnv(Settings.PH_PARENT_DOMAIN_NAME)}`;
}

export function getWildcardTenantDomain(): string {
    return `*.${getTenantDomain()}`;
}

export function getCdkEnv() {
    return {
        account: getEnv(Settings.CDK_DEFAULT_ACCOUNT),
        region: getEnv(Settings.CDK_DEFAULT_REGION),
    };
}