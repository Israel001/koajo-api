import { registerAs } from '@nestjs/config';

export interface AdminConfig {
  superAdmin: {
    email: string;
    password: string;
    passwordHash: string | null;
  };
  defaultPageSize: number;
}

export default registerAs('admin', (): AdminConfig => {
  const defaultPassword = 'ChangeMe123!';

  return {
    superAdmin: {
      email: (process.env.ADMIN_SUPER_EMAIL ?? 'superadmin@koajo.local').trim().toLowerCase(),
      password: process.env.ADMIN_SUPER_PASSWORD ?? defaultPassword,
      passwordHash: process.env.ADMIN_SUPER_PASSWORD_HASH ?? null,
    },
    defaultPageSize: Number.parseInt(
      process.env.ADMIN_DEFAULT_PAGE_SIZE ?? '50',
      10,
    ),
  };
});
