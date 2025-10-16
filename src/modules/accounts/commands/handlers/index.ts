import { LoginHandler } from './login.handler';
import { RegisterAccountHandler } from './register-account.handler';
import { ResendEmailVerificationHandler } from './resend-email-verification.handler';
import { VerifyEmailHandler } from './verify-email.handler';
import { CompleteStripeVerificationHandler } from './complete-stripe-verification.handler';
import { ChangePasswordHandler } from './change-password.handler';
import { ForgotPasswordHandler } from './forgot-password.handler';
import { ResetPasswordHandler } from './reset-password.handler';
import { ProcessAccountInactivityHandler } from './process-account-inactivity.handler';

export const CommandHandlers = [
  RegisterAccountHandler,
  VerifyEmailHandler,
  ResendEmailVerificationHandler,
  ChangePasswordHandler,
  ForgotPasswordHandler,
  CompleteStripeVerificationHandler,
  ResetPasswordHandler,
  LoginHandler,
  ProcessAccountInactivityHandler,
];

export { RegisterAccountHandler } from './register-account.handler';
export { VerifyEmailHandler } from './verify-email.handler';
export { ResendEmailVerificationHandler } from './resend-email-verification.handler';
export { LoginHandler } from './login.handler';
export { CompleteStripeVerificationHandler } from './complete-stripe-verification.handler';
export { ChangePasswordHandler } from './change-password.handler';
export { ForgotPasswordHandler } from './forgot-password.handler';
export { ResetPasswordHandler } from './reset-password.handler';
export { ProcessAccountInactivityHandler } from './process-account-inactivity.handler';
