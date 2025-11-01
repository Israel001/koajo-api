import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { RegisterAccountCommand } from '../commands/register-account.command';
import { VerifyEmailCommand } from '../commands/verify-email.command';
import { ResendEmailVerificationCommand } from '../commands/resend-email-verification.command';
import { LoginCommand } from '../commands/login.command';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { ForgotPasswordCommand } from '../commands/forgot-password.command';
import { ResetPasswordCommand } from '../commands/reset-password.command';
import { UpdateAvatarCommand } from '../commands/update-avatar.command';
import { UpdateNotificationPreferencesCommand } from '../commands/update-notification-preferences.command';
import { RecordIdentityVerificationCommand } from '../commands/record-identity-verification.command';
import { UpdateUserProfileCommand } from '../commands/update-user-profile.command';
import { UpsertStripeCustomerCommand } from '../commands/upsert-stripe-customer.command';
import { UpsertStripeBankAccountCommand } from '../commands/upsert-stripe-bank-account.command';
import { DeleteAccountCommand } from '../commands/delete-account.command';
import { SignupDto } from '../dto/signup.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type {
  LoginResult,
  ResendVerificationResult,
  SignupResult,
  ChangePasswordResult,
  ForgotPasswordResult,
  ResetPasswordResult,
  UpdateAvatarResult,
  UpdateNotificationPreferencesResult,
  DeleteAccountResult,
} from '../contracts/auth-results';
import { AccountEntity } from '../entities/account.entity';
import { AccountVerificationAttemptEntity } from '../entities/account-verification-attempt.entity';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let commandBus: { execute: jest.Mock };
  let accountRepository: { findOne: jest.Mock };
  let verificationAttemptRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn(),
    };
    accountRepository = {
      findOne: jest.fn(),
    } as any;
    verificationAttemptRepository = {
      findOne: jest.fn(),
    } as any;
    const mockGuard = {
      canActivate: jest.fn(() => true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: accountRepository,
        },
        {
          provide: getRepositoryToken(AccountVerificationAttemptEntity),
          useValue: verificationAttemptRepository,
        },
        {
          provide: JwtAuthGuard,
          useValue: mockGuard,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('signup', () => {
    it('delegates to RegisterAccountCommand and returns the result', async () => {
      const dto: SignupDto = {
        email: 'user@example.com',
        phoneNumber: '+2348012345678',
        password: 'Str0ngP@ssword!',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      };
      const request = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'jest-test',
        },
      } as unknown as Request;

      const expected: SignupResult = {
        id: 'account-123',
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        avatarUrl: dto.avatarUrl,
        emailVerified: false,
        verification: null,
      };

      commandBus.execute.mockResolvedValue(expected);

      await expect(controller.signup(dto, request)).resolves.toEqual(expected);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(RegisterAccountCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as RegisterAccountCommand;
      expect(command.email).toEqual(dto.email);
      expect(command.phoneNumber).toEqual(dto.phoneNumber);
      expect(command.password).toEqual(dto.password);
      expect(command.avatarUrl).toEqual(dto.avatarUrl);
      expect(command.metadata).toEqual({
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    });
  });

  describe('verifyEmail', () => {
    it('executes VerifyEmailCommand', async () => {
      const dto: VerifyEmailDto = {
        email: 'user@example.com',
        token:
          'd4c6e8f7ab2c4d1e3f4a5b6c7d8e9f00112233445566778899aabbccddeeff00',
      };

      commandBus.execute.mockResolvedValue(undefined);

      await expect(controller.verifyEmail(dto)).resolves.toEqual({
        email: dto.email,
        verified: true,
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(VerifyEmailCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as VerifyEmailCommand;
      expect(command.email).toEqual(dto.email);
      expect(command.token).toEqual(dto.token);
    });
  });

  describe('resendEmail', () => {
    it('executes ResendEmailVerificationCommand and returns the result', async () => {
      const dto: ResendVerificationDto = {
        email: 'user@example.com',
      };

      const expected: ResendVerificationResult = {
        email: dto.email,
        verification: {
          expiresAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
        },
      };

      commandBus.execute.mockResolvedValue(expected);

      await expect(controller.resendEmail(dto)).resolves.toEqual(expected);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(ResendEmailVerificationCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as ResendEmailVerificationCommand;
      expect(command.email).toEqual(dto.email);
    });
  });

  describe('forgotPassword', () => {
    it('executes ForgotPasswordCommand and returns the result', async () => {
      const dto: ForgotPasswordDto = {
        email: 'user@example.com',
      };

      const expected: ForgotPasswordResult = {
        email: dto.email,
        requested: true,
      };

      commandBus.execute.mockResolvedValue(expected);

      await expect(controller.forgotPassword(dto)).resolves.toEqual(expected);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(ForgotPasswordCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as ForgotPasswordCommand;
      expect(command.email).toEqual(dto.email);
      expect(command.isResend).toBe(false);
    });
  });

  describe('resendForgotPassword', () => {
    it('delegates to ForgotPasswordCommand with resend flag', async () => {
      const dto: ForgotPasswordDto = {
        email: 'user@example.com',
      };

      const expected: ForgotPasswordResult = {
        email: dto.email,
        requested: true,
      };

      commandBus.execute.mockResolvedValue(expected);

      await expect(controller.resendForgotPassword(dto)).resolves.toEqual(
        expected,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(ForgotPasswordCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as ForgotPasswordCommand;
      expect(command.email).toEqual(dto.email);
      expect(command.isResend).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('executes ResetPasswordCommand and returns the result', async () => {
      const dto: ResetPasswordDto = {
        email: 'user@example.com',
        token:
          'd4c6e8f7ab2c4d1e3f4a5b6c7d8e9f00112233445566778899aabbccddeeff00',
        newPassword: 'N3wStr0ngP@ssword!',
      };

      const expected: ResetPasswordResult = {
        email: dto.email,
        reset: true,
      };

      commandBus.execute.mockResolvedValue(expected);

      await expect(controller.resetPassword(dto)).resolves.toEqual(expected);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(ResetPasswordCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as ResetPasswordCommand;
      expect(command.email).toEqual(dto.email);
      expect(command.token).toEqual(dto.token);
      expect(command.newPassword).toEqual(dto.newPassword);
    });
  });

  describe('changePassword', () => {
    it('executes ChangePasswordCommand and returns the result', async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'Curr3ntP@ss!',
        newPassword: 'N3wStr0ngP@ssword!',
      };

      const expected: ChangePasswordResult = {
        success: true,
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: {
          accountId: 'account-123',
          email: 'user@example.com',
        },
      } as unknown as Request;

      await expect(controller.changePassword(request, dto)).resolves.toEqual(
        expected,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(ChangePasswordCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as ChangePasswordCommand;
      expect(command.accountId).toEqual('account-123');
      expect(command.currentPassword).toEqual(dto.currentPassword);
      expect(command.newPassword).toEqual(dto.newPassword);
    });
  });

  describe('updateAvatar', () => {
    it('executes UpdateAvatarCommand and returns the result', async () => {
      const dto = {
        avatarUrl: 'https://cdn.example.com/new-avatar.png',
      };

      const expected: UpdateAvatarResult = {
        avatarUrl: dto.avatarUrl,
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: {
          accountId: 'account-123',
        },
      } as unknown as Request;

      await expect(controller.updateAvatar(request, dto as any)).resolves.toEqual(
        expected,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateAvatarCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as UpdateAvatarCommand;
      expect(command.accountId).toEqual('account-123');
      expect(command.avatarUrl).toEqual(dto.avatarUrl);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('executes UpdateNotificationPreferencesCommand and returns the result', async () => {
      const dto = {
        emailNotificationsEnabled: false,
        transactionNotificationsEnabled: true,
      };

      const expected: UpdateNotificationPreferencesResult = {
        emailNotificationsEnabled: dto.emailNotificationsEnabled,
        transactionNotificationsEnabled: dto.transactionNotificationsEnabled,
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: {
          accountId: 'account-123',
        },
      } as unknown as Request;

      await expect(
        controller.updateNotificationPreferences(request, dto as any),
      ).resolves.toEqual(expected);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateNotificationPreferencesCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as UpdateNotificationPreferencesCommand;
      expect(command.accountId).toEqual('account-123');
      expect(command.emailNotificationsEnabled).toEqual(
        dto.emailNotificationsEnabled,
      );
      expect(command.transactionNotificationsEnabled).toEqual(
        dto.transactionNotificationsEnabled,
      );
    });
  });

  describe('recordIdentityVerification', () => {
    it('delegates to RecordIdentityVerificationCommand', async () => {
      const dto = {
        identityId: 'iv_123',
        sessionId: 'sess_123',
        resultId: 'res_456',
        status: 'verified',
        type: 'document',
      };

      const expected: RecordIdentityVerificationResult = {
        id: 'attempt-1',
        identity_id: dto.identityId,
        session_id: dto.sessionId,
        result_id: dto.resultId,
        status: dto.status,
        type: dto.type,
        completed_at: new Date().toISOString(),
        recorded_at: new Date().toISOString(),
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: { accountId: 'account-1' },
      } as AuthenticatedRequest;

      await expect(
        controller.recordIdentityVerification(request, dto as any),
      ).resolves.toEqual(expected);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(RecordIdentityVerificationCommand),
      );
      const command = commandBus.execute.mock.calls[0][0] as RecordIdentityVerificationCommand;
      expect(command.accountId).toBe('account-1');
      expect(command.identityId).toBe(dto.identityId);
      expect(command.resultId).toBe(dto.resultId);
    });
  });

  describe('updateUser', () => {
    it('delegates to UpdateUserProfileCommand', async () => {
      const dto = {
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1990-05-10',
        phone: '+2348012345678',
      };

      const expected: UpdateUserProfileResult = {
        user: {
          id: 'account-1',
          email: 'user@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          phone: '+2348012345678',
          email_verified: false,
          agreed_to_terms: true,
          date_of_birth: '1990-05-10',
          avatar_id: null,
          is_active: true,
          last_login_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          identity_verification: null,
          customer: null,
          bank_account: null,
        },
        verification: null,
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: { accountId: 'account-1' },
      } as AuthenticatedRequest;

      await expect(controller.updateUser(request, dto as any)).resolves.toEqual(
        expected,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateUserProfileCommand),
      );
      const command = commandBus.execute.mock.calls[0][0] as UpdateUserProfileCommand;
      expect(command.accountId).toBe('account-1');
      expect(command.firstName).toBe(dto.firstName);
      expect(command.dateOfBirth).toBe(dto.dateOfBirth);
    });
  });

  describe('linkStripeCustomer', () => {
    it('delegates to UpsertStripeCustomerCommand', async () => {
      const dto = {
        customerId: 'cus_123',
        ssnLast4: '1234',
        address: { line1: '123 Road' },
      };

      const expected: UpsertStripeCustomerResult = {
        id: dto.customerId,
        ssn_last4: dto.ssnLast4!,
        address: dto.address!,
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: { accountId: 'account-1' },
      } as AuthenticatedRequest;

      await expect(
        controller.linkStripeCustomer(request, dto as any),
      ).resolves.toEqual(expected);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpsertStripeCustomerCommand),
      );
      const command = commandBus.execute.mock.calls[0][0] as UpsertStripeCustomerCommand;
      expect(command.accountId).toBe('account-1');
      expect(command.stripeCustomerId).toBe(dto.customerId);
      expect(command.ssnLast4).toBe(dto.ssnLast4);
      expect(command.address).toEqual(dto.address);
    });
  });

  describe('linkStripeBankAccount', () => {
    it('delegates to UpsertStripeBankAccountCommand', async () => {
      const dto = {
        bankAccountId: 'ba_123',
        customerId: 'cus_123',
      };

      const expected: UpsertStripeBankAccountResult = {
        id: dto.bankAccountId,
        customer_id: dto.customerId,
        created_at: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        updated_at: new Date('2025-01-01T00:05:00.000Z').toISOString(),
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: { accountId: 'account-1' },
      } as AuthenticatedRequest;

      await expect(
        controller.linkStripeBankAccount(request, dto as any),
      ).resolves.toEqual(expected);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpsertStripeBankAccountCommand),
      );
      const command = commandBus.execute.mock.calls[0][0] as UpsertStripeBankAccountCommand;
      expect(command.accountId).toBe('account-1');
      expect(command.bankAccountId).toBe(dto.bankAccountId);
    });
  });

  describe('deleteAccount', () => {
    it('delegates to DeleteAccountCommand', async () => {
      const expected: DeleteAccountResult = {
        success: true,
        deleted_at: new Date().toISOString(),
      };

      commandBus.execute.mockResolvedValue(expected);

      const request = {
        user: { accountId: 'account-1' },
      } as AuthenticatedRequest;

      await expect(controller.deleteAccount(request)).resolves.toEqual(
        expected,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(DeleteAccountCommand),
      );
      const command = commandBus.execute.mock.calls[0][0] as DeleteAccountCommand;
      expect(command.accountId).toBe('account-1');
    });
  });

  describe('me', () => {
    it('returns the authenticated user details with defaults', async () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');
      const emailVerifiedAt = new Date('2025-01-01T12:00:00.000Z');
      const dateOfBirth = new Date('1990-05-10T00:00:00.000Z');
      const completedAt = new Date('2025-01-01T13:00:00.000Z');
      const recordedAt = new Date('2025-01-01T12:30:00.000Z');
      const bankLinkedAt = new Date('2025-01-01T02:00:00.000Z');
      const bankUpdatedAt = new Date('2025-01-01T03:00:00.000Z');

      accountRepository.findOne.mockResolvedValue({
        id: 'account-1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+2348012345678',
        emailVerifiedAt,
        isActive: true,
        createdAt,
        updatedAt,
        agreedToTerms: true,
        dateOfBirth,
        lastLoginAt: null,
        emailNotificationsEnabled: true,
        transactionNotificationsEnabled: false,
        stripeIdentityId: 'iv_123',
        stripeIdentityResultId: 'res_456',
        stripeCustomerId: 'cus_123',
        stripeCustomerSsnLast4: '1234',
        stripeCustomerAddress: { line1: '123 Road' },
        stripeBankAccountId: 'ba_123',
        stripeBankAccountCustomerId: 'cus_123',
        stripeBankAccountLinkedAt: bankLinkedAt,
        stripeBankAccountUpdatedAt: bankUpdatedAt,
      });

      verificationAttemptRepository.findOne.mockResolvedValue({
        providerReference: 'iv_123',
        resultId: 'res_456',
        status: 'verified',
        type: 'document',
        sessionId: 'sess_123',
        completedAt,
        createdAt: recordedAt,
      });

      const request = {
        user: {
          accountId: 'account-1',
        },
      } as AuthenticatedRequest;

      const result = await controller.me(request);

      expect(result).toEqual({
        id: 'account-1',
        email: 'user@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '+2348012345678',
        email_verified: true,
        agreed_to_terms: true,
        date_of_birth: '1990-05-10',
        avatar_id: null,
        is_active: true,
        emailNotificationsEnabled: true,
        transactionNotificationsEnabled: false,
        last_login_at: null,
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
        identity_verification: {
          id: 'iv_123',
          result_id: 'res_456',
          status: 'verified',
          type: 'document',
          session_id: 'sess_123',
          completed_at: completedAt.toISOString(),
          recorded_at: recordedAt.toISOString(),
        },
        customer: {
          id: 'cus_123',
          ssn_last4: '1234',
          address: { line1: '123 Road' },
        },
        bank_account: {
          id: 'ba_123',
          customer_id: 'cus_123',
          created_at: bankLinkedAt.toISOString(),
          updated_at: bankUpdatedAt.toISOString(),
        },
      });

      expect(accountRepository.findOne).toHaveBeenCalledWith({
        id: 'account-1',
      });
      expect(verificationAttemptRepository.findOne).toHaveBeenCalled();
    });

    it('throws NotFoundException when account is missing', async () => {
      accountRepository.findOne.mockResolvedValue(null);

      const request = {
        user: {
          accountId: 'missing-account',
        },
      } as AuthenticatedRequest;

      await expect(controller.me(request)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('login', () => {
    it('executes LoginCommand and returns the result', async () => {
      const dto: LoginDto = {
        email: 'user@example.com',
        password: 'Str0ngP@ssword!',
      };
      const request = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'jest-test',
        },
      } as unknown as Request;

      const nowIso = new Date().toISOString();

      const expected: LoginResult = {
        accessToken: 'token',
        expiresAt: nowIso,
        user: {
          id: 'account-1',
          email: dto.email,
          first_name: 'Jane',
          last_name: 'Doe',
          phone: '+2348012345678',
          email_verified: true,
          agreed_to_terms: true,
          date_of_birth: '1990-05-10',
          avatar_id: null,
          is_active: true,
          emailNotificationsEnabled: true,
          transactionNotificationsEnabled: true,
          last_login_at: nowIso,
          created_at: new Date('2025-01-01T00:00:00.000Z').toISOString(),
          updated_at: new Date('2025-01-01T00:00:00.000Z').toISOString(),
          identity_verification: null,
          customer: null,
          bank_account: null,
        },
      } as LoginResult;

      commandBus.execute.mockResolvedValue(expected);

      await expect(controller.login(dto, request)).resolves.toEqual(expected);
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(LoginCommand));

      const command = commandBus.execute.mock.calls[0][0] as LoginCommand;
      expect(command.email).toEqual(dto.email);
      expect(command.password).toEqual(dto.password);
      expect(command.metadata).toEqual({
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    });
  });
});
