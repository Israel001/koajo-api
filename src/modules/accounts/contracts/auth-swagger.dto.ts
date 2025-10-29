import { ApiProperty } from '@nestjs/swagger';
import type {
  LoginResult,
  LoginSuccessResult,
  LoginVerificationRequiredResult,
  ResendVerificationResult,
  SignupResult,
  ChangePasswordResult,
  ForgotPasswordResult,
  ResetPasswordResult,
  UpdateAvatarResult,
  UpdateNotificationPreferencesResult,
  CurrentUserResult,
  RecordIdentityVerificationResult,
  UpdateUserProfileResult,
  UpsertStripeCustomerResult,
  UpsertStripeBankAccountResult,
  LoginUserResult,
  DeleteAccountResult,
} from './auth-results';

class VerificationExpiryDto {
  @ApiProperty({
    description: 'ISO date string indicating when the verification expires.',
    example: '2024-01-01T00:00:00.000Z',
  })
  expiresAt!: string;
}

class VerificationWindowDto extends VerificationExpiryDto {
  @ApiProperty({
    description: 'ISO date string indicating when the verification was sent.',
    example: '2024-01-01T00:00:00.000Z',
  })
  sentAt!: string;
}

export class SignupResultDto implements SignupResult {
  @ApiProperty({
    description: 'Unique identifier for the registered account.',
    example: '9a4c1d15-3bfe-4f3f-8428-9c2ac5d43052',
  })
  id!: string;

  @ApiProperty({ description: 'Registered account email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'Registered phone number in E.164 format.', example: '+2348012345678' })
  phoneNumber!: string;

  @ApiProperty({
    description: 'Avatar image URL if provided during signup.',
    example: 'https://cdn.example.com/avatars/user.png',
    required: false,
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({ description: 'Indicates whether the email is verified after signup.', example: false })
  emailVerified!: boolean;

  @ApiProperty({
    description: 'Verification information for completing signup.',
    type: () => VerificationExpiryDto,
    required: false,
    nullable: true,
  })
  verification!: VerificationExpiryDto | null;
}

export class ChangePasswordResultDto implements ChangePasswordResult {
  @ApiProperty({ description: 'Indicates that the password update was successful.', example: true })
  success!: boolean;
}

export class ForgotPasswordResultDto implements ForgotPasswordResult {
  @ApiProperty({ description: 'Account email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'Indicates that the reset request was registered.', example: true })
  requested!: boolean;
}

export class ResetPasswordResultDto implements ResetPasswordResult {
  @ApiProperty({ description: 'Account email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'Indicates that the password was successfully reset.', example: true })
  reset!: boolean;
}

export class ResendVerificationResultDto implements ResendVerificationResult {
  @ApiProperty({ description: 'Account email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({
    description: 'Details about the freshly issued verification email.',
    type: () => VerificationWindowDto,
  })
  verification!: VerificationWindowDto;
}

export class LoginSuccessResultDto implements LoginSuccessResult {
  @ApiProperty({ description: 'Indicates whether verification is required.', example: false })
  requiresVerification!: false;

  @ApiProperty({ description: 'JWT access token granting API access.', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ description: 'Token type to use in the Authorization header.', example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({
    description: 'ISO date string indicating when the token expires.',
    example: '2024-01-01T01:00:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    description: 'Authenticated user details.',
    type: () => LoginUserResultDto,
  })
  user!: LoginUserResultDto;
}

export class LoginUserResultDto implements LoginUserResult {
  @ApiProperty({ description: 'Account identifier.' })
  id!: string;

  @ApiProperty({ description: 'Account email address.' })
  email!: string;

  @ApiProperty({ description: 'First name of the account holder.', nullable: true })
  first_name!: string | null;

  @ApiProperty({ description: 'Last name of the account holder.', nullable: true })
  last_name!: string | null;

  @ApiProperty({ description: 'Primary phone number on file.', nullable: true })
  phone!: string | null;

  @ApiProperty({ description: 'Indicates if the email address is verified.' })
  email_verified!: boolean;

  @ApiProperty({ description: 'Date of birth in ISO format.', nullable: true, example: '1990-01-01' })
  date_of_birth!: string | null;

  @ApiProperty({ description: 'Avatar identifier or URL.', nullable: true })
  avatar_id!: string | null;

  @ApiProperty({ description: 'Indicates if the account is active.' })
  is_active!: boolean;

  @ApiProperty({ description: 'Timestamp of the last login.', nullable: true })
  last_login_at!: string | null;

  @ApiProperty({ description: 'Timestamp when the account was created.' })
  created_at!: string;

  @ApiProperty({ description: 'Timestamp when the account was last updated.' })
  updated_at!: string;
}

export class LoginVerificationRequiredResultDto implements LoginVerificationRequiredResult {
  @ApiProperty({ description: 'Indicates that verification is required.', example: true })
  requiresVerification!: true;

  @ApiProperty({ description: 'Account email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({
    description: 'Details about the verification email sent for login.',
    type: () => VerificationWindowDto,
  })
  verification!: VerificationWindowDto;
}

export class VerifyEmailResultDto {
  @ApiProperty({ description: 'Account email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'Indicates whether the email is now verified.', example: true })
  verified!: boolean;
}

export class UpdateAvatarResultDto implements UpdateAvatarResult {
  @ApiProperty({
    description: 'Updated avatar URL. Null means the avatar has been cleared.',
    example: 'https://cdn.example.com/avatars/user.png',
    nullable: true,
  })
  avatarUrl!: string | null;
}

export class UpdateNotificationPreferencesResultDto
  implements UpdateNotificationPreferencesResult
{
  @ApiProperty({ description: 'Indicates if general system emails are enabled.', example: true })
  emailNotificationsEnabled!: boolean;

  @ApiProperty({
    description: 'Indicates if transaction-related emails are enabled.',
    example: true,
  })
  transactionNotificationsEnabled!: boolean;
}

export class CurrentUserResultDto implements CurrentUserResult {
  @ApiProperty({ description: 'Account identifier.' })
  id!: string;

  @ApiProperty({ description: 'Account email address.' })
  email!: string;

  @ApiProperty({
    description: 'First name of the account holder, if available.',
    nullable: true,
  })
  first_name!: string | null;

  @ApiProperty({
    description: 'Last name of the account holder, if available.',
    nullable: true,
  })
  last_name!: string | null;

  @ApiProperty({
    description: 'Phone number associated with the account, if provided.',
    nullable: true,
  })
  phone!: string | null;

  @ApiProperty({
    description: 'Indicates whether the email address has been verified.',
  })
  email_verified!: boolean;

  @ApiProperty({
    description: 'Indicates whether the user agreed to the terms of service.',
  })
  agreed_to_terms!: boolean;

  @ApiProperty({
    description: 'Date of birth for the account holder.',
    nullable: true,
    example: '1990-01-01',
  })
  date_of_birth!: string | null;

  @ApiProperty({
    description: 'Identifier of the selected avatar.',
    nullable: true,
  })
  avatar_id!: string | null;

  @ApiProperty({
    description: 'Indicates whether the account is active.',
  })
  is_active!: boolean;

  @ApiProperty({
    description: 'Timestamp of the last login.',
    nullable: true,
  })
  last_login_at!: string | null;

  @ApiProperty({
    description: 'Timestamp when the account was created.',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Timestamp when the account was last updated.',
  })
  updated_at!: string;

  @ApiProperty({
    description: 'Details about the latest identity verification attempt.',
    nullable: true,
    type: () => IdentityVerificationDto,
  })
  identity_verification!: IdentityVerificationDto | null;

  @ApiProperty({
    description: 'Stripe customer details linked to the account.',
    nullable: true,
    type: () => StripeCustomerDto,
  })
  customer!: StripeCustomerDto | null;

  @ApiProperty({
    description: 'Stripe bank account linked to the account.',
    nullable: true,
    type: () => StripeBankAccountDto,
  })
  bank_account!: StripeBankAccountDto | null;
}

class IdentityVerificationDto
  implements RecordIdentityVerificationResult
{
  @ApiProperty({ description: 'Identifier of the verification attempt.' })
  id!: string;

  @ApiProperty({ description: 'Stripe identity verification identifier.', nullable: true })
  identity_id!: string | null;

  @ApiProperty({ description: 'Stripe session identifier.' })
  session_id!: string;

  @ApiProperty({ description: 'Identifier of the verification result.', nullable: true })
  result_id!: string | null;

  @ApiProperty({ description: 'Status returned by Stripe.' })
  status!: string;

  @ApiProperty({ description: 'Type of the verification performed.' })
  type!: string;

  @ApiProperty({ description: 'ISO timestamp when the attempt completed.', nullable: true })
  completed_at!: string | null;

  @ApiProperty({ description: 'ISO timestamp when the attempt was recorded.' })
  recorded_at!: string;
}

class StripeCustomerDto implements UpsertStripeCustomerResult {
  @ApiProperty({ description: 'Stripe customer identifier.' })
  id!: string;

  @ApiProperty({ description: 'Last four digits of the customer SSN.', nullable: true })
  ssn_last4!: string | null;

  @ApiProperty({ description: 'Customer address information.', nullable: true, type: Object })
  address!: Record<string, unknown> | null;
}

class StripeBankAccountDto implements UpsertStripeBankAccountResult {
  @ApiProperty({ description: 'Stripe bank account identifier.' })
  id!: string;

  @ApiProperty({ description: 'Stripe customer identifier associated with the bank account.', nullable: true })
  customer_id!: string | null;

  @ApiProperty({ description: 'Timestamp when the bank account link was created.' })
  created_at!: string;

  @ApiProperty({ description: 'Timestamp when the bank account link was last updated.' })
  updated_at!: string;
}

export class RecordIdentityVerificationResultDto
  extends IdentityVerificationDto
  implements RecordIdentityVerificationResult {}

export class UpdateUserProfileResultDto implements UpdateUserProfileResult {
  @ApiProperty({ description: 'Updated user profile.' })
  user!: CurrentUserResultDto;

  @ApiProperty({
    description: 'Details about the verification email that was issued, if any.',
    nullable: true,
    type: () => VerificationWindowDto,
  })
  verification!: VerificationWindowDto | null;
}

export class UpsertStripeCustomerResultDto
  extends StripeCustomerDto
  implements UpsertStripeCustomerResult {}

export class UpsertStripeBankAccountResultDto
  extends StripeBankAccountDto
  implements UpsertStripeBankAccountResult {}

export class DeleteAccountResultDto implements DeleteAccountResult {
  @ApiProperty({ description: 'Indicates that the account data has been removed.' })
  success!: boolean;

  @ApiProperty({ description: 'Timestamp when the deletion request was processed.' })
  deleted_at!: string;
}
