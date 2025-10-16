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
    description: 'Total number of recorded Stripe verification attempts.',
    example: 2,
    nullable: true,
  })
  verificationAttemptCount!: number | null;

  @ApiProperty({
    description: 'ISO timestamp of the first Stripe verification attempt, if known.',
    example: '2024-05-01T09:30:00.000Z',
    nullable: true,
  })
  verificationFirstAttemptDate!: string | null;

  @ApiProperty({
    description: 'ISO timestamp of the latest Stripe verification attempt, if known.',
    example: '2024-05-02T16:45:00.000Z',
    nullable: true,
  })
  verificationLastAttemptDate!: string | null;

  @ApiProperty({
    description: 'Latest verification status reported by Stripe (e.g. `pending`).',
    example: 'pending',
    nullable: true,
  })
  verificationStatus!: string | null;

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
