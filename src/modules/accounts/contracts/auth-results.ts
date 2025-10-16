export interface SignupResult {
  accountId: string;
  email: string;
  phoneNumber: string;
  emailVerified: boolean;
  verification: {
    expiresAt: string;
  } | null;
}

export interface CompleteStripeVerificationResult {
  email: string;
  stripeVerificationCompleted: boolean;
  verificationAttemptCount: number | null;
  verificationFirstAttemptDate: string | null;
  verificationLastAttemptDate: string | null;
  verificationStatus: string | null;
  verification: {
    expiresAt: string;
    sentAt: string;
  } | null;
}

export interface ChangePasswordResult {
  success: boolean;
}

export interface ForgotPasswordResult {
  email: string;
  requested: boolean;
}

export interface ResetPasswordResult {
  email: string;
  reset: boolean;
}

export interface ResendVerificationResult {
  email: string;
  verification: {
    expiresAt: string;
    sentAt: string;
  };
}

export interface LoginSuccessResult {
  requiresVerification: false;
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
}

export interface LoginVerificationRequiredResult {
  requiresVerification: true;
  email: string;
  verification: {
    expiresAt: string;
    sentAt: string;
  };
}

export type LoginResult = LoginSuccessResult | LoginVerificationRequiredResult;
