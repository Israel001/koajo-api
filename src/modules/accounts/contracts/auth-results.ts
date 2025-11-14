export interface SignupResult {
  id: string;
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

export interface LoginIdentityVerification {
  id: string | null;
  resultId: string | null;
  status?: string | null;
  type?: string | null;
  sessionId?: string | null;
  completedAt?: string | null;
  recordedAt?: string | null;
}

export interface LoginCustomerSummary {
  id: string;
  ssnLast4: string | null;
  address: Record<string, unknown> | null;
}

export interface LoginBankAccountSummary {
  id: string;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
  last4: string | null;
}

export interface LoginUserResult {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  agreedToTerms: boolean;
  dateOfBirth: string | null;
  avatarId: string | null;
  isActive: boolean;
  emailNotificationsEnabled: boolean;
  transactionNotificationsEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  identityVerification: LoginIdentityVerification | null;
  customer: LoginCustomerSummary | null;
  bankAccount: LoginBankAccountSummary | null;
}

export interface LoginSuccessResult {
  tokenType: 'Bearer';
  accessToken: string;
  expiresAt: string;
  refreshToken: string | null;
  refreshExpiresAt: string | null;
  user: LoginUserResult;
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

export interface CurrentUserResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified: boolean;
  agreed_to_terms: boolean;
  date_of_birth: string | null;
  avatar_url: string | null;
  is_active: boolean;
  emailNotificationsEnabled: boolean;
  transactionNotificationsEnabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  identity_verification: {
    id: string | null;
    result_id: string | null;
    status?: string | null;
    type?: string | null;
    session_id?: string | null;
    completed_at?: string | null;
    recorded_at?: string | null;
  } | null;
  customer: {
    id: string;
    ssn_last4: string | null;
    address: Record<string, unknown> | null;
  } | null;
  bank_account: {
    id: string;
    customer_id: string | null;
    created_at: string;
    updated_at: string;
    last4: string | null;
  } | null;
}

export interface RecordIdentityVerificationResult {
  id: string;
  identity_id: string | null;
  session_id: string;
  result_id: string | null;
  status: string;
  type: string;
  completed_at: string | null;
  recorded_at: string;
}

export interface UpdateUserProfileResult {
  user: CurrentUserResult;
  verification: {
    expiresAt: string;
    sentAt: string;
  } | null;
}

export interface UpsertStripeCustomerResult {
  id: string;
  ssn_last4: string | null;
  address: Record<string, unknown> | null;
}

export interface UpsertStripeBankAccountResult {
  id: string;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
  last4: string | null;
}

export interface DeleteAccountResult {
  success: boolean;
  deleted_at: string;
}
