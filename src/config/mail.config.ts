import { registerAs } from '@nestjs/config';

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
};

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? 'localhost',
  port: Number.parseInt(process.env.MAIL_PORT ?? '1025', 10),
  secure: toBool(process.env.MAIL_SECURE, false),
  user: process.env.MAIL_USER ?? '',
  pass: process.env.MAIL_PASSWORD ?? '',
  defaultFrom:
    process.env.MAIL_FROM ?? 'Koajo Notifications <no-reply@koajo.local>',
}));
