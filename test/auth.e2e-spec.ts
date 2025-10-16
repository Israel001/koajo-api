import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from '../src/modules/accounts/controllers/auth.controller';
import { RegisterAccountCommand } from '../src/modules/accounts/commands/register-account.command';
import { VerifyEmailCommand } from '../src/modules/accounts/commands/verify-email.command';
import { ResendEmailVerificationCommand } from '../src/modules/accounts/commands/resend-email-verification.command';
import { LoginCommand } from '../src/modules/accounts/commands/login.command';
import { ChangePasswordCommand } from '../src/modules/accounts/commands/change-password.command';
import { ForgotPasswordCommand } from '../src/modules/accounts/commands/forgot-password.command';
import { ResetPasswordCommand } from '../src/modules/accounts/commands/reset-password.command';
import { JwtAuthGuard } from '../src/modules/accounts/guards/jwt-auth.guard';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const commandBus = { execute: jest.fn() };
  const mockGuard = {
    canActivate: (context: any) => {
      const request = context.switchToHttp().getRequest();
      request.user = {
        accountId: 'account-123',
        email: 'user@example.com',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const server = app.getHttpServer() as any;
    if (!server.address || !server.address()) {
      server.address = () => ({ port: 0 });
      server.listen = (_port: number, callback?: () => void) => {
        if (callback) {
          callback();
        }
        return server;
      };
    }
  });

  beforeEach(() => {
    commandBus.execute.mockReset();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /v1/auth/signup responds with account details', async () => {
    const responseBody = {
      accountId: 'account-123',
      email: 'user@example.com',
      phoneNumber: '+2348012345678',
      emailVerified: false,
      verification: {
        expiresAt: new Date().toISOString(),
      },
    };

    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(RegisterAccountCommand);
      const registerCommand = command as RegisterAccountCommand;
      expect(registerCommand.metadata).toEqual({
        ipAddress: expect.any(String),
        userAgent: 'supertest-signup-agent',
      });
      return responseBody;
    });

    await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .set('User-Agent', 'supertest-signup-agent')
      .send({
        email: 'user@example.com',
        phoneNumber: '+2348012345678',
        password: 'Str0ngP@ssword!',
      })
      .expect(201)
      .expect(responseBody);
  });

  it('POST /v1/auth/verify-email confirms verification', async () => {
    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(VerifyEmailCommand);
    });

    await request(app.getHttpServer())
      .post('/v1/auth/verify-email')
      .send({
        email: 'user@example.com',
        token:
          'd4c6e8f7ab2c4d1e3f4a5b6c7d8e9f00112233445566778899aabbccddeeff00',
      })
      .expect(200)
      .expect({
        email: 'user@example.com',
        verified: true,
      });
  });

  it('POST /v1/auth/resend-email returns verification info', async () => {
    const responseBody = {
      email: 'user@example.com',
      verification: {
        expiresAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      },
    };

    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(ResendEmailVerificationCommand);
      return responseBody;
    });

    await request(app.getHttpServer())
      .post('/v1/auth/resend-email')
      .send({
        email: 'user@example.com',
      })
      .expect(200)
      .expect(responseBody);
  });

  it('POST /v1/auth/forgot-password requests a reset link', async () => {
    const responseBody = {
      email: 'user@example.com',
      requested: true,
    };

    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(ForgotPasswordCommand);
      return responseBody;
    });

    await request(app.getHttpServer())
      .post('/v1/auth/forgot-password')
      .send({
        email: 'user@example.com',
      })
      .expect(200)
      .expect(responseBody);
  });

  it('POST /v1/auth/reset-password resets the password', async () => {
    const responseBody = {
      email: 'user@example.com',
      reset: true,
    };

    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(ResetPasswordCommand);
      const resetCommand = command as ResetPasswordCommand;
      expect(resetCommand.email).toEqual('user@example.com');
      expect(resetCommand.token).toEqual(
        'd4c6e8f7ab2c4d1e3f4a5b6c7d8e9f00112233445566778899aabbccddeeff00',
      );
      expect(resetCommand.newPassword).toEqual('N3wStr0ngP@ssword!');
      return responseBody;
    });

    await request(app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({
        email: 'user@example.com',
        token:
          'd4c6e8f7ab2c4d1e3f4a5b6c7d8e9f00112233445566778899aabbccddeeff00',
        newPassword: 'N3wStr0ngP@ssword!',
      })
      .expect(200)
      .expect(responseBody);
  });

  it('POST /v1/auth/change-password updates the password', async () => {
    const responseBody = {
      success: true,
    };

    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(ChangePasswordCommand);
      const changeCommand = command as ChangePasswordCommand;
      expect(changeCommand.accountId).toEqual('account-123');
      expect(changeCommand.currentPassword).toEqual('Curr3ntP@ss!');
      expect(changeCommand.newPassword).toEqual('N3wStr0ngP@ssword!');
      return responseBody;
    });

    await request(app.getHttpServer())
      .post('/v1/auth/change-password')
      .set('Authorization', 'Bearer token')
      .send({
        currentPassword: 'Curr3ntP@ss!',
        newPassword: 'N3wStr0ngP@ssword!',
      })
      .expect(200)
      .expect(responseBody);
  });

  it('POST /v1/auth/login returns access token when verified', async () => {
    const responseBody = {
      requiresVerification: false,
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: new Date().toISOString(),
    };

    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(LoginCommand);
      const loginCommand = command as LoginCommand;
      expect(loginCommand.metadata).toEqual({
        ipAddress: expect.any(String),
        userAgent: 'supertest-login-agent',
      });
      return responseBody;
    });

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('User-Agent', 'supertest-login-agent')
      .send({
        email: 'user@example.com',
        password: 'Str0ngP@ssword!',
      })
      .expect(200)
      .expect(responseBody);
  });

  it('POST /v1/auth/login returns verification requirement when needed', async () => {
    const responseBody = {
      requiresVerification: true,
      email: 'user@example.com',
      verification: {
        expiresAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      },
    };

    commandBus.execute.mockImplementation(async (command: unknown) => {
      expect(command).toBeInstanceOf(LoginCommand);
      const loginCommand = command as LoginCommand;
      expect(loginCommand.metadata).toEqual({
        ipAddress: expect.any(String),
        userAgent: 'supertest-login-agent',
      });
      return responseBody;
    });

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('User-Agent', 'supertest-login-agent')
      .send({
        email: 'user@example.com',
        password: 'Str0ngP@ssword!',
      })
      .expect(200)
      .expect(responseBody);
  });
});
