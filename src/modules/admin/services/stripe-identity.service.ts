import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeIdentityService {
  private readonly logger = new Logger(StripeIdentityService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly configService: ConfigService) {
    const secretKey =
      this.configService.get<string>('stripe.secretKey', { infer: true }) ?? '';
    const apiVersion =
      this.configService.get<string>('stripe.apiVersion', { infer: true }) ??
      '2024-06-20';

    this.stripe =
      secretKey && secretKey.trim().length
        ? new Stripe(secretKey, { apiVersion: apiVersion as Stripe.LatestApiVersion })
        : null;

    if (!this.stripe) {
      this.logger.warn(
        'Stripe secret key is not configured; verification session lookups will return null.',
      );
    }
  }

  async retrieveVerificationSession(
    sessionId: string,
  ): Promise<Stripe.Identity.VerificationSession | null> {
    if (!this.stripe || !sessionId) {
      return null;
    }

    try {
      return await this.stripe.identity.verificationSessions.retrieve(sessionId);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve Stripe verification session ${sessionId}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }
}
