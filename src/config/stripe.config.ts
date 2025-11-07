import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  secretKey: string;
  apiVersion: string;
}

export default registerAs('stripe', (): StripeConfig => ({
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  apiVersion: process.env.STRIPE_API_VERSION ?? '2024-06-20',
}));
