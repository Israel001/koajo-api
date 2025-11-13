import { registerAs } from '@nestjs/config';

const parseDurationToSeconds = (value: string): number => {
  const trimmed = value.trim().toLowerCase();
  const match = /^([0-9]+)([smhd]?)$/.exec(trimmed);

  if (!match) {
    return Number.parseInt(trimmed, 10);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return amount * 60 * 60 * 24;
    case 'h':
      return amount * 60 * 60;
    case 'm':
      return amount * 60;
    case 's':
    case '':
      return amount;
    default:
      return amount;
  }
};

export default registerAs('auth', () => {
  const accessTtlRaw = process.env.JWT_ACCESS_TTL ?? '15m';

  return {
    jwt: {
      accessSecret:
        process.env.JWT_ACCESS_SECRET ??
        'replace-me-with-a-strong-secret-value',
      accessTtlSeconds: parseDurationToSeconds(accessTtlRaw),
      issuer: process.env.JWT_ISSUER ?? 'koajo-api',
      audience: process.env.JWT_AUDIENCE ?? 'koajo-clients',
    },
    emailVerification: {
      ttlSeconds: Number.parseInt(
        process.env.EMAIL_VERIFICATION_TTL ?? '600',
        10,
      ),
      resendCooldownSeconds: Number.parseInt(
        process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN ?? '60',
        10,
      ),
      maxAttempts: Number.parseInt(
        process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS ?? '5',
        10,
      ),
      redirectBaseUrl:
        process.env.EMAIL_VERIFICATION_REDIRECT_URL ??
        'https://koajo.com/register/verify-email',
    },
    passwordReset: {
      ttlSeconds: Number.parseInt(
        process.env.PASSWORD_RESET_TTL ?? '900',
        10,
      ),
      maxAttempts: Number.parseInt(
        process.env.PASSWORD_RESET_MAX_ATTEMPTS ?? '5',
        10,
      ),
      redirectBaseUrl:
        process.env.PASSWORD_RESET_REDIRECT_URL ??
        'https://koajo-web.vercel.app/auth/new-password',
    },
  };
});
