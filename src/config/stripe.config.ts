import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  secretKey: string;
  apiVersion: string;
  defaultCurrency: string;
  webhookSecret?: string;
}

export default registerAs(
  'stripe',
  (): StripeConfig => ({
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    apiVersion: process.env.STRIPE_API_VERSION ?? '2024-06-20',
    defaultCurrency: (
      process.env.STRIPE_DEFAULT_CURRENCY ?? 'usd'
    ).toLowerCase(),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? undefined,
  }),
);
