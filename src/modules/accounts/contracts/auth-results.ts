export interface SignupResult {
  accountId: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  verification: {
    expiresAt: string;
  } | null;
}

export interface UpdateAvatarResult {
  avatarUrl: string | null;
}

export interface UpdateNotificationPreferencesResult {
  emailNotificationsEnabled: boolean;
  transactionNotificationsEnabled: boolean;
}

export interface CompleteStripeVerificationResult {
  email: string;
  stripeVerificationCompleted: boolean;
  latestAttempt: {
    id: string;
    sessionId: string;
    stripeReference: string;
    status: string;
    type: string;
    recordedAt: string;
    completedAt: string | null;
  };
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
