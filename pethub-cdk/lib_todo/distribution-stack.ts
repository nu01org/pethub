import * as cdk from 'aws-cdk-lib/core';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface DistributionStackProps extends cdk.StackProps {
  /** The ALB from EcsStack used as the default CloudFront origin. */
  readonly alb: elbv2.IApplicationLoadBalancer;

  /**
   * Time-to-live for cached responses.
   * Set to 0 to disable caching (useful for fully dynamic SSR apps).
   * @default cdk.Duration.seconds(0)
   */
  readonly defaultTtl?: cdk.Duration;
}

export class DistributionStack extends cdk.Stack {
  /** The CloudFront distribution. */
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: DistributionStackProps) {
    super(scope, id, props);

    const { alb, defaultTtl = cdk.Duration.seconds(0) } = props;

    // ── Origin ────────────────────────────────────────────────────────────────
    // Point CloudFront at the ALB over HTTP (port 80). The ALB handles TLS
    // termination internally; HTTPS from viewers to CloudFront is handled by
    // the default CloudFront certificate.
    const albOrigin = new origins.LoadBalancerV2Origin(alb, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      httpPort: 80,
      // Forward the Host header so the app can reconstruct request URLs.
      customHeaders: {},
    });

    // ── Cache policy ──────────────────────────────────────────────────────────
    // For a server-rendered SvelteKit app we default to no caching so every
    // request reaches the origin. Switch to a custom policy if you want to
    // cache static assets by path pattern.
    const cachePolicy = new cloudfront.CachePolicy(this, 'CachePolicy', {
      defaultTtl,
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(86400),
      // Include the Authorization and Cookie headers in the cache key so
      // authenticated responses are not served to the wrong user.
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // ── Origin request policy ─────────────────────────────────────────────────
    // Forward all headers, cookies, and query strings to the ALB so the
    // SvelteKit app sees the original request intact.
    const originRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      'OriginRequestPolicy',
      {
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          'Host',
          'CloudFront-Forwarded-Proto',
          'X-Forwarded-For',
        ),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      },
    );

    // ── Distribution ──────────────────────────────────────────────────────────
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: albOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy,
        originRequestPolicy,
        compress: true,
      },
      // HTTP/2 + HTTP/3 for best performance.
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // Return a 404 from CloudFront for unknown paths instead of forwarding.
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404',
          ttl: cdk.Duration.seconds(10),
        },
      ],
      comment: 'pethub-web CloudFront distribution',
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${this.stackName}-DistributionDomainName`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'AppUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Public HTTPS URL for pethub-web via CloudFront',
      exportName: `${this.stackName}-AppUrl`,
    });
  }
}
