import { LoginHandler } from './login.handler';
import { RegisterAccountHandler } from './register-account.handler';
import { ResendEmailVerificationHandler } from './resend-email-verification.handler';
import { VerifyEmailHandler } from './verify-email.handler';
import { ChangePasswordHandler } from './change-password.handler';
import { ForgotPasswordHandler } from './forgot-password.handler';
import { ResetPasswordHandler } from './reset-password.handler';
import { ProcessAccountInactivityHandler } from './process-account-inactivity.handler';
import { UpdateAvatarHandler } from './update-avatar.handler';
import { UpdateNotificationPreferencesHandler } from './update-notification-preferences.handler';
import { RecordIdentityVerificationHandler } from './record-identity-verification.handler';
import { UpdateUserProfileHandler } from './update-user-profile.handler';
import { UpsertStripeCustomerHandler } from './upsert-stripe-customer.handler';
import { UpsertStripeBankAccountHandler } from './upsert-stripe-bank-account.handler';
import { DeleteAccountHandler } from './delete-account.handler';
import { RefreshAccessTokenHandler } from './refresh-access-token.handler';

export const CommandHandlers = [
  RegisterAccountHandler,
  VerifyEmailHandler,
  ResendEmailVerificationHandler,
  ChangePasswordHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  LoginHandler,
  ProcessAccountInactivityHandler,
  UpdateAvatarHandler,
  UpdateNotificationPreferencesHandler,
  RecordIdentityVerificationHandler,
  UpdateUserProfileHandler,
  UpsertStripeCustomerHandler,
  UpsertStripeBankAccountHandler,
  DeleteAccountHandler,
  RefreshAccessTokenHandler,
];

export { RegisterAccountHandler } from './register-account.handler';
export { VerifyEmailHandler } from './verify-email.handler';
export { ResendEmailVerificationHandler } from './resend-email-verification.handler';
export { LoginHandler } from './login.handler';
export { ChangePasswordHandler } from './change-password.handler';
export { ForgotPasswordHandler } from './forgot-password.handler';
export { ResetPasswordHandler } from './reset-password.handler';
export { ProcessAccountInactivityHandler } from './process-account-inactivity.handler';
export { UpdateAvatarHandler } from './update-avatar.handler';
export { UpdateNotificationPreferencesHandler } from './update-notification-preferences.handler';
export { RecordIdentityVerificationHandler } from './record-identity-verification.handler';
export { UpdateUserProfileHandler } from './update-user-profile.handler';
export { UpsertStripeCustomerHandler } from './upsert-stripe-customer.handler';
export { UpsertStripeBankAccountHandler } from './upsert-stripe-bank-account.handler';
export { DeleteAccountHandler } from './delete-account.handler';
export { RefreshAccessTokenHandler } from './refresh-access-token.handler';
