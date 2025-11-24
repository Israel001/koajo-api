import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  NotFoundException,
  Patch,
  Post,
  Delete,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { format } from 'date-fns';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { parse } from 'date-fns';
import { LoginCommand } from '../commands/login.command';
import { RegisterAccountCommand } from '../commands/register-account.command';
import { ResendEmailVerificationCommand } from '../commands/resend-email-verification.command';
import { VerifyEmailCommand } from '../commands/verify-email.command';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { ForgotPasswordCommand } from '../commands/forgot-password.command';
import { ResetPasswordCommand } from '../commands/reset-password.command';
import { UpdateAvatarCommand } from '../commands/update-avatar.command';
import { UpdateNotificationPreferencesCommand } from '../commands/update-notification-preferences.command';
import { RefreshAccessTokenCommand } from '../commands/refresh-access-token.command';
import type {
  LoginResult,
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
  DeleteAccountResult,
  LoginSuccessResult,
  AccountNotificationsResult,
} from '../contracts/auth-results';
import {
  LoginSuccessResultDto,
  ResendVerificationResultDto,
  SignupResultDto,
  VerifyEmailResultDto,
  ChangePasswordResultDto,
  ForgotPasswordResultDto,
  ResetPasswordResultDto,
  UpdateAvatarResultDto,
  UpdateNotificationPreferencesResultDto,
  CurrentUserResultDto,
  LoginUserResultDto,
  RecordIdentityVerificationResultDto,
  UpdateUserProfileResultDto,
  UpsertStripeCustomerResultDto,
  UpsertStripeBankAccountResultDto,
  DeleteAccountResultDto,
  AccountNotificationsResultDto,
} from '../contracts/auth-swagger.dto';
import * as LoginDtoModule from '../dto/login.dto';
import * as ResendVerificationDtoModule from '../dto/resend-verification.dto';
import * as SignupDtoModule from '../dto/signup.dto';
import * as VerifyEmailDtoModule from '../dto/verify-email.dto';
import * as ChangePasswordDtoModule from '../dto/change-password.dto';
import * as ForgotPasswordDtoModule from '../dto/forgot-password.dto';
import * as ResetPasswordDtoModule from '../dto/reset-password.dto';
import * as UpdateAvatarDtoModule from '../dto/update-avatar.dto';
import * as UpdateNotificationPreferencesDtoModule from '../dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';
import { AccountEntity } from '../entities/account.entity';
import { RecordIdentityVerificationCommand } from '../commands/record-identity-verification.command';
import { UpdateUserProfileCommand } from '../commands/update-user-profile.command';
import { UpsertStripeCustomerCommand } from '../commands/upsert-stripe-customer.command';
import { UpsertStripeBankAccountCommand } from '../commands/upsert-stripe-bank-account.command';
import { RecordIdentityVerificationDto } from '../dto/record-identity-verification.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { UpsertStripeCustomerDto } from '../dto/upsert-stripe-customer.dto';
import { UpsertStripeBankAccountDto } from '../dto/upsert-stripe-bank-account.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AccountVerificationAttemptEntity } from '../entities/account-verification-attempt.entity';
import { DeleteAccountCommand } from '../commands/delete-account.command';
import { AccountNotificationEntity } from '../entities/account-notification.entity';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(AccountVerificationAttemptEntity)
    private readonly verificationAttemptRepository: EntityRepository<AccountVerificationAttemptEntity>,
    @InjectRepository(AccountNotificationEntity)
    private readonly notificationRepository: EntityRepository<AccountNotificationEntity>,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Retrieve the authenticated user profile.' })
  @ApiOkResponse({
    description: 'Authenticated user details.',
    type: CurrentUserResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async me(@Req() request: AuthenticatedRequest): Promise<CurrentUserResult> {
    const account = await this.accountRepository.findOne({
      id: request.user.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const latestAttempt = await this.verificationAttemptRepository.findOne(
      { account },
      { orderBy: { createdAt: 'DESC' } },
    );

    return {
      id: account.id,
      email: account.email,
      first_name: account.firstName ?? null,
      last_name: account.lastName ?? null,
      phone: account.phoneNumber ?? null,
      email_verified: Boolean(account.emailVerifiedAt),
      agreed_to_terms: account.agreedToTerms,
      date_of_birth: this.serializeDateOnly(account.dateOfBirth),
      avatar_url: account.avatarUrl ?? null,
      is_active: account.isActive,
      emailNotificationsEnabled: account.emailNotificationsEnabled,
      transactionNotificationsEnabled: account.transactionNotificationsEnabled,
      last_login_at: account.lastLoginAt
        ? account.lastLoginAt.toISOString()
        : null,
      created_at: account.createdAt.toISOString(),
      updated_at: account.updatedAt.toISOString(),
      identity_verification:
        account.stripeIdentityId ||
        account.stripeIdentityResultId ||
        latestAttempt
          ? {
              id:
                account.stripeIdentityId ??
                latestAttempt?.providerReference ??
                null,
              result_id:
                account.stripeIdentityResultId ??
                latestAttempt?.resultId ??
                null,
              status: latestAttempt?.status ?? null,
              type: latestAttempt?.type ?? null,
              session_id: latestAttempt?.sessionId ?? null,
              completed_at: latestAttempt?.completedAt
                ? latestAttempt.completedAt.toISOString()
                : null,
              recorded_at: latestAttempt
                ? latestAttempt.createdAt.toISOString()
                : null,
            }
          : null,
      customer: account.stripeCustomerId
        ? {
            id: account.stripeCustomerId,
            ssn_last4: account.stripeBankAccountLast4 ?? null,
            address: account.stripeCustomerAddress ?? null,
            recipient_id: account.stripeRecipientId ?? null,
            payout_status: account.payoutStatus ?? null,
            payout_method_id: account.payoutMethodId ?? null,
          }
        : null,
      bank_account: account.stripeBankAccountId
        ? {
            id: account.stripeBankAccountId,
            customer_id:
              account.stripeBankAccountCustomerId ??
              account.stripeCustomerId ??
              null,
            created_at: (
              account.stripeBankAccountLinkedAt ?? account.createdAt
            ).toISOString(),
            updated_at: (
              account.stripeBankAccountUpdatedAt ?? account.updatedAt
            ).toISOString(),
            last4: account.stripeBankAccountLast4 ?? null,
            bank_name: account.stripeBankName ?? null,
          }
        : null,
      dob: account.dateOfBirth
        ? format(account.dateOfBirth, 'MM-dd-yyyy')
        : null,
      line1: (account.address as any)?.line1 ?? null,
      city: (account.address as any)?.city ?? null,
      state: (account.address as any)?.state ?? null,
      postal_code: (account.address as any)?.postal_code ?? null,
      country: (account.address as any)?.country ?? null,
    };
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List in-app notifications for the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Notification feed for the authenticated user.',
    type: AccountNotificationsResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async listNotifications(
    @Req() request: AuthenticatedRequest,
  ): Promise<AccountNotificationsResult> {
    const notifications = await this.notificationRepository.find(
      { account: request.user.accountId },
      { orderBy: { createdAt: 'DESC' } },
    );

    return {
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        severity: notification.severity,
        action_url: notification.actionUrl ?? null,
        read_at: notification.readAt
          ? notification.readAt.toISOString()
          : null,
        created_at: notification.createdAt.toISOString(),
      })),
    };
  }

  @Patch('notifications/:notificationId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Mark a specific in-app notification as read.',
  })
  @ApiOkResponse({
    description: 'Notification marked as read.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        read_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Notification not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async markNotificationRead(
    @Req() request: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
  ): Promise<{ id: string; read_at: string }> {
    const notification = await this.notificationRepository.findOne({
      id: notificationId,
      account: request.user.accountId,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    const now = new Date();
    notification.readAt = now;
    await this.notificationRepository.getEntityManager().flush();

    return { id: notification.id, read_at: now.toISOString() };
  }

  @Patch('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Mark all in-app notifications as read for the authenticated user.',
  })
  @ApiNoContentResponse({ description: 'All notifications marked as read.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async markAllNotificationsRead(
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const now = new Date();
    await this.notificationRepository
      .getEntityManager()
      .nativeUpdate(
        AccountNotificationEntity,
        { account: request.user.accountId, readAt: null },
        { readAt: now },
      );
  }

  private serializeDateOnly(
    value: Date | string | null | undefined,
  ): string | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  }

  @Post('identity-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record Stripe identity verification details.' })
  @ApiCreatedResponse({
    description: 'Identity verification recorded.',
    type: RecordIdentityVerificationResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async recordIdentityVerification(
    @Req() request: AuthenticatedRequest,
    @Body() payload: RecordIdentityVerificationDto,
  ): Promise<RecordIdentityVerificationResult> {
    return this.commandBus.execute(
      new RecordIdentityVerificationCommand(
        request.user.accountId,
        payload.identityId,
        payload.sessionId,
        payload.resultId,
        payload.status,
        payload.type,
        payload.firstName,
        payload.lastName,
      ),
    );
  }

  @Patch('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update core user profile fields.' })
  @ApiOkResponse({
    description: 'User profile updated.',
    type: UpdateUserProfileResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async updateUser(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpdateUserProfileDto,
  ): Promise<UpdateUserProfileResult> {
    return this.commandBus.execute(
      new UpdateUserProfileCommand(
        request.user.accountId,
        payload.firstName,
        payload.lastName,
        payload.dateOfBirth,
        payload.phone,
        this.resolveVerificationRedirectBase(payload.origin),
      ),
    );
  }

  @Post('stripe/customer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Link a Stripe customer to the authenticated account.',
  })
  @ApiCreatedResponse({
    description: 'Stripe customer stored.',
    type: UpsertStripeCustomerResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async linkStripeCustomer(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpsertStripeCustomerDto,
  ): Promise<UpsertStripeCustomerResult> {
    return this.commandBus.execute(
      new UpsertStripeCustomerCommand(
        request.user.accountId,
        payload.customerId,
        payload.ssnLast4 ?? null,
        payload.address ?? null,
        payload.stripeRecipientId ?? null,
        payload.payoutStatus ?? null,
        payload.payoutMethodId ?? null,
      ),
    );
  }

  @Post('stripe/bank-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Link a Stripe bank account to the authenticated account.',
  })
  @ApiCreatedResponse({
    description: 'Stripe bank account stored.',
    type: UpsertStripeBankAccountResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async linkStripeBankAccount(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpsertStripeBankAccountDto,
  ): Promise<UpsertStripeBankAccountResult> {
    return this.commandBus.execute(
      new UpsertStripeBankAccountCommand(
        request.user.accountId,
        payload.bankAccountId,
        payload.customerId,
        payload.bankName,
        payload.accountFirstName,
        payload.accountLastName,
        payload.accountLast4,
        payload.paymentMethodId,
        payload.connectedAccountId ?? null,
        payload.routingNumber ?? null,
        payload.accountNumber ?? null,
      ),
    );
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete the authenticated account data.' })
  @ApiOkResponse({
    description: 'Account data removal acknowledged.',
    type: DeleteAccountResultDto,
  })
  async deleteAccount(
    @Req() request: AuthenticatedRequest,
  ): Promise<DeleteAccountResult> {
    return this.commandBus.execute(
      new DeleteAccountCommand(request.user.accountId),
    );
  }

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 300 } })
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
    const parsedDob =
      payload.dob && payload.dob.trim().length
        ? parse(payload.dob.trim(), 'MM-dd-yyyy', new Date())
        : null;
    const address =
      payload.line1 &&
      payload.city &&
      payload.state &&
      payload.postal_code &&
      payload.country
        ? {
            line1: payload.line1,
            city: payload.city,
            state: payload.state,
            postal_code: payload.postal_code,
            country: payload.country,
          }
        : null;
    return this.commandBus.execute(
      new RegisterAccountCommand(
        payload.email,
        payload.phoneNumber,
        payload.password,
        payload.avatarUrl ?? null,
        payload.first_name,
        payload.last_name,
        parsedDob,
        address,
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
  async verifyEmail(
    @Body() payload: VerifyEmailDtoModule.VerifyEmailDto,
  ): Promise<{
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

  @Post('resend-email')
  @Throttle({ default: { limit: 3, ttl: 180 } })
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
      new ResendEmailVerificationCommand(
        payload.email,
        this.resolveVerificationRedirectBase(payload.origin),
      ),
    );
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 180 } })
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
      new ForgotPasswordCommand(
        payload.email,
        false,
        this.resolvePasswordResetRedirectBase(payload.origin),
      ),
    );
  }

  @Post('forgot-password/resend')
  @Throttle({ default: { limit: 3, ttl: 180 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend a password reset link' })
  @ApiOkResponse({
    description: 'Password reset email re-dispatched if account exists.',
    type: ForgotPasswordResultDto,
  })
  async resendForgotPassword(
    @Body() payload: ForgotPasswordDtoModule.ForgotPasswordDto,
  ): Promise<ForgotPasswordResult> {
    return this.commandBus.execute(
      new ForgotPasswordCommand(
        payload.email,
        true,
        this.resolvePasswordResetRedirectBase(payload.origin),
      ),
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
  @ApiBadRequestResponse({
    description: 'No changes supplied or payload invalid.',
  })
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
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiExtraModels(
    LoginSuccessResultDto,
    LoginUserResultDto,
    CurrentUserResultDto,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an account' })
  @ApiOkResponse({
    description: 'Login result.',
    content: {
      'application/json': {
        schema: {
          $ref: getSchemaPath(LoginSuccessResultDto),
        },
        examples: {
          success: {
            summary: 'Authentication succeeded',
            value: {
              tokenType: 'Bearer',
              accessToken: 'token-example',
              expiresAt: '2025-01-01T00:00:00.000Z',
              refreshToken: 'refresh-token-example',
              refreshExpiresAt: '2025-01-08T00:00:00.000Z',
              user: {
                id: 'account-id',
                email: 'user@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
                phone: '+2348012345678',
                emailVerified: true,
                agreedToTerms: true,
                dateOfBirth: '1990-05-10',
                avatarId: null,
                isActive: true,
                emailNotificationsEnabled: true,
                transactionNotificationsEnabled: true,
                lastLoginAt: '2025-01-01T00:00:00.000Z',
                createdAt: '2024-12-31T00:00:00.000Z',
                updatedAt: '2025-01-01T00:00:00.000Z',
                identityVerification: null,
                customer: null,
                bankAccount: null,
              },
            },
          },
        },
      },
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
      new LoginCommand(
        payload.email,
        payload.password,
        Boolean(payload.rememberMe),
        {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      ),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh an access token using a refresh token' })
  @ApiOkResponse({
    description: 'Access token refreshed.',
    type: LoginSuccessResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or expired.' })
  async refresh(@Body() payload: RefreshTokenDto): Promise<LoginSuccessResult> {
    return this.commandBus.execute(
      new RefreshAccessTokenCommand(payload.refreshToken),
    );
  }

  private resolveVerificationRedirectBase(
    origin?: string | null,
  ): string | null {
    const normalizedOrigin = this.normalizeOriginBase(origin ?? null);
    return normalizedOrigin
      ? `${normalizedOrigin}/register/verify-email`
      : null;
  }

  private resolvePasswordResetRedirectBase(
    origin?: string | null,
  ): string | null {
    const normalizedOrigin = this.normalizeOriginBase(origin ?? null);
    return normalizedOrigin
      ? `${normalizedOrigin}/auth/new-password`
      : null;
  }

  private normalizeOriginBase(raw: string | null): string | null {
    if (!raw) {
      return null;
    }
    const candidate = raw.split(',')[0]?.trim();
    if (!candidate) {
      return null;
    }
    try {
      const url = new URL(candidate);
      if (!url.host) {
        return null;
      }
      const protocol = url.protocol.replace(/:$/, '') || 'https';
      return `${protocol}://${url.host}`;
    } catch {
      return null;
    }
  }
}
