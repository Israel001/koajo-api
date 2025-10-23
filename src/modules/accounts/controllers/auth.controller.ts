import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { LoginCommand } from '../commands/login.command';
import { RegisterAccountCommand } from '../commands/register-account.command';
import { ResendEmailVerificationCommand } from '../commands/resend-email-verification.command';
import { VerifyEmailCommand } from '../commands/verify-email.command';
import { CompleteStripeVerificationCommand } from '../commands/complete-stripe-verification.command';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { ForgotPasswordCommand } from '../commands/forgot-password.command';
import { ResetPasswordCommand } from '../commands/reset-password.command';
import { UpdateAvatarCommand } from '../commands/update-avatar.command';
import { UpdateNotificationPreferencesCommand } from '../commands/update-notification-preferences.command';
import type {
  LoginResult,
  ResendVerificationResult,
  SignupResult,
  CompleteStripeVerificationResult,
  ChangePasswordResult,
  ForgotPasswordResult,
  ResetPasswordResult,
  UpdateAvatarResult,
  UpdateNotificationPreferencesResult,
} from '../contracts/auth-results';
import {
  LoginSuccessResultDto,
  LoginVerificationRequiredResultDto,
  ResendVerificationResultDto,
  SignupResultDto,
  VerifyEmailResultDto,
  CompleteStripeVerificationResultDto,
  ChangePasswordResultDto,
  ForgotPasswordResultDto,
  ResetPasswordResultDto,
  UpdateAvatarResultDto,
  UpdateNotificationPreferencesResultDto,
} from '../contracts/auth-swagger.dto';
import * as LoginDtoModule from '../dto/login.dto';
import * as ResendVerificationDtoModule from '../dto/resend-verification.dto';
import * as SignupDtoModule from '../dto/signup.dto';
import * as VerifyEmailDtoModule from '../dto/verify-email.dto';
import * as CompleteStripeVerificationDtoModule from '../dto/complete-stripe-verification.dto';
import * as ChangePasswordDtoModule from '../dto/change-password.dto';
import * as ForgotPasswordDtoModule from '../dto/forgot-password.dto';
import * as ResetPasswordDtoModule from '../dto/reset-password.dto';
import * as UpdateAvatarDtoModule from '../dto/update-avatar.dto';
import * as UpdateNotificationPreferencesDtoModule from '../dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiCreatedResponse({
    description: 'Account successfully created.',
    type: SignupResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or account already exists.',
  })
  async signup(
    @Body() payload: SignupDtoModule.SignupDto,
    @Req() request: Request,
  ): Promise<SignupResult> {
    return this.commandBus.execute(
      new RegisterAccountCommand(
        payload.email,
        payload.phoneNumber,
        payload.password,
        payload.avatarUrl ?? null,
        {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      ),
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email verification link token' })
  @ApiOkResponse({
    description: 'Email successfully verified.',
    type: VerifyEmailResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification link.',
  })
  async verifyEmail(@Body() payload: VerifyEmailDtoModule.VerifyEmailDto): Promise<{
    email: string;
    verified: boolean;
  }> {
    await this.commandBus.execute(
      new VerifyEmailCommand(payload.email, payload.token),
    );

    return {
      email: payload.email,
      verified: true,
    };
  }

  @Post('stripe-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record Stripe verification status and dispatch email verification if eligible' })
  @ApiOkResponse({
    description: 'Stripe verification status updated.',
    type: CompleteStripeVerificationResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed for provided payload.',
  })
  @ApiNotFoundResponse({
    description: 'Account not found for provided email.',
  })
  async completeStripeVerification(
    @Body()
    payload: CompleteStripeVerificationDtoModule.CompleteStripeVerificationDto,
  ): Promise<CompleteStripeVerificationResult> {
    return this.commandBus.execute(
      new CompleteStripeVerificationCommand(
        payload.email,
        payload.firstName,
        payload.lastName,
        payload.stripeVerificationCompleted,
        payload.sessionId,
        payload.stripeReference,
        payload.verificationType,
        payload.verificationStatus,
      ),
    );
  }

  @Post('resend-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiOkResponse({
    description: 'Verification email re-issued.',
    type: ResendVerificationResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Cooldown not elapsed or email invalid.',
  })
  async resendEmail(
    @Body() payload: ResendVerificationDtoModule.ResendVerificationDto,
  ): Promise<ResendVerificationResult> {
    return this.commandBus.execute(
      new ResendEmailVerificationCommand(payload.email),
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiOkResponse({
    description: 'Password reset email dispatched if account exists.',
    type: ForgotPasswordResultDto,
  })
  async forgotPassword(
    @Body() payload: ForgotPasswordDtoModule.ForgotPasswordDto,
  ): Promise<ForgotPasswordResult> {
    return this.commandBus.execute(
      new ForgotPasswordCommand(payload.email),
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password using a reset link token' })
  @ApiOkResponse({
    description: 'Password reset completed.',
    type: ResetPasswordResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid, expired, or mismatched reset token.',
  })
  @ApiNotFoundResponse({
    description: 'Account not found.',
  })
  async resetPassword(
    @Body() payload: ResetPasswordDtoModule.ResetPasswordDto,
  ): Promise<ResetPasswordResult> {
    return this.commandBus.execute(
      new ResetPasswordCommand(
        payload.email,
        payload.token,
        payload.newPassword,
      ),
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Change the authenticated account password' })
  @ApiOkResponse({
    description: 'Password successfully updated.',
    type: ChangePasswordResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or current password is incorrect.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required or token invalid.',
  })
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() payload: ChangePasswordDtoModule.ChangePasswordDto,
  ): Promise<ChangePasswordResult> {
    return this.commandBus.execute(
      new ChangePasswordCommand(
        request.user.accountId,
        payload.currentPassword,
        payload.newPassword,
      ),
    );
  }

  @Patch('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update the authenticated account avatar' })
  @ApiOkResponse({
    description: 'Avatar updated successfully.',
    type: UpdateAvatarResultDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid avatar URL supplied.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async updateAvatar(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpdateAvatarDtoModule.UpdateAvatarDto,
  ): Promise<UpdateAvatarResult> {
    return this.commandBus.execute(
      new UpdateAvatarCommand(request.user.accountId, payload.avatarUrl),
    );
  }

  @Patch('profile/notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update email notification preferences' })
  @ApiOkResponse({
    description: 'Notification preferences updated.',
    type: UpdateNotificationPreferencesResultDto,
  })
  @ApiBadRequestResponse({ description: 'No changes supplied or payload invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async updateNotificationPreferences(
    @Req() request: AuthenticatedRequest,
    @Body()
    payload: UpdateNotificationPreferencesDtoModule.UpdateNotificationPreferencesDto,
  ): Promise<UpdateNotificationPreferencesResult> {
    return this.commandBus.execute(
      new UpdateNotificationPreferencesCommand(
        request.user.accountId,
        payload.emailNotificationsEnabled,
        payload.transactionNotificationsEnabled,
      ),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an account' })
  @ApiResponse({
    status: 200,
    description: 'Login result.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(LoginSuccessResultDto) },
        { $ref: getSchemaPath(LoginVerificationRequiredResultDto) },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credentials are invalid or account requires verification.',
  })
  async login(
    @Body() payload: LoginDtoModule.LoginDto,
    @Req() request: Request,
  ): Promise<LoginResult> {
    return this.commandBus.execute(
      new LoginCommand(payload.email, payload.password, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      }),
    );
  }
}
