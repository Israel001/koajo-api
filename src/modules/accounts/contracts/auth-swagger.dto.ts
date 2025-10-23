import { ApiProperty } from '@nestjs/swagger';
import type {
  LoginResult,
  LoginSuccessResult,
  LoginVerificationRequiredResult,
  CompleteStripeVerificationResult,
  ResendVerificationResult,
  SignupResult,
  ChangePasswordResult,
  ForgotPasswordResult,
  ResetPasswordResult,
  UpdateAvatarResult,
  UpdateNotificationPreferencesResult,
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
  accountId!: string;

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

class VerificationAttemptDto {
  @ApiProperty({ description: 'Identifier for the verification record.', example: 'e3b0c442-...'})
  id!: string;

  @ApiProperty({ description: 'Stripe session identifier.', example: 'sess_1234567890' })
  sessionId!: string;

  @ApiProperty({
    description: 'Stripe reference identifier associated with this verification attempt.',
    example: 'vs_1QB2m4Fo222Y9bAd3S',
  })
  stripeReference!: string;

  @ApiProperty({ description: 'Status reported by Stripe.', example: 'verified' })
  status!: string;

  @ApiProperty({ description: 'Verification type (e.g. document, biometric).', example: 'document' })
  type!: string;

  @ApiProperty({ description: 'ISO timestamp when this attempt was recorded.' })
  recordedAt!: string;

  @ApiProperty({ description: 'ISO timestamp when verification completed, if applicable.', nullable: true })
  completedAt!: string | null;
}

export class CompleteStripeVerificationResultDto
  implements CompleteStripeVerificationResult
{
  @ApiProperty({ description: 'Account email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({
    description: 'Indicates whether Stripe verification has been completed.',
    example: true,
  })
  stripeVerificationCompleted!: boolean;

  @ApiProperty({
    description: 'Details of the most recent verification attempt.',
    type: () => VerificationAttemptDto,
  })
  latestAttempt!: VerificationAttemptDto;

  @ApiProperty({
    description:
      'Details about the verification email sent after Stripe completion, if any.',
    type: () => VerificationWindowDto,
    required: false,
    nullable: true,
  })
  verification!: VerificationWindowDto | null;
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
