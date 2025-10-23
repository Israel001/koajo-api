import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { RegisterAccountCommand } from '../commands/register-account.command';
import { VerifyEmailCommand } from '../commands/verify-email.command';
import { ResendEmailVerificationCommand } from '../commands/resend-email-verification.command';
import { LoginCommand } from '../commands/login.command';
import { CompleteStripeVerificationCommand } from '../commands/complete-stripe-verification.command';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { ForgotPasswordCommand } from '../commands/forgot-password.command';
import { ResetPasswordCommand } from '../commands/reset-password.command';
import { UpdateAvatarCommand } from '../commands/update-avatar.command';
import { UpdateNotificationPreferencesCommand } from '../commands/update-notification-preferences.command';
import { SignupDto } from '../dto/signup.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { LoginDto } from '../dto/login.dto';
import { CompleteStripeVerificationDto } from '../dto/complete-stripe-verification.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
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

describe('AuthController', () => {
  let controller: AuthController;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn(),
    };
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
        accountId: 'account-123',
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

  describe('completeStripeVerification', () => {
    it('executes CompleteStripeVerificationCommand and returns the result', async () => {
      const dto: CompleteStripeVerificationDto = {
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        stripeVerificationCompleted: true,
        sessionId: 'sess_123',
        stripeReference: 'vs_123',
        verificationType: 'document',
        verificationStatus: 'verified',
      };

      const expected: CompleteStripeVerificationResult = {
        email: dto.email,
        stripeVerificationCompleted: true,
        latestAttempt: {
          id: 'attempt-1',
          sessionId: dto.sessionId,
          stripeReference: dto.stripeReference,
          status: dto.verificationStatus,
          type: dto.verificationType,
          recordedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        verification: {
          expiresAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
        },
      };

      commandBus.execute.mockResolvedValue(expected);

      await expect(controller.completeStripeVerification(dto)).resolves.toEqual(
        expected,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CompleteStripeVerificationCommand),
      );

      const command =
        commandBus.execute.mock.calls[0][0] as CompleteStripeVerificationCommand;
      expect(command.email).toEqual(dto.email);
      expect(command.firstName).toEqual(dto.firstName);
      expect(command.lastName).toEqual(dto.lastName);
      expect(command.stripeVerificationCompleted).toEqual(
        dto.stripeVerificationCompleted,
      );
      expect(command.sessionId).toEqual(dto.sessionId);
      expect(command.stripeReference).toEqual(dto.stripeReference);
      expect(command.verificationType).toEqual(dto.verificationType);
      expect(command.verificationStatus).toEqual(dto.verificationStatus);
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

      const expected: LoginResult = {
        requiresVerification: false,
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresAt: new Date().toISOString(),
      };

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
