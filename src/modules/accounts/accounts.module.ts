import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CommandHandlers } from './commands/handlers';
import { AuthController } from './controllers/auth.controller';
import { AccountEmailVerificationEntity } from './entities/account-email-verification.entity';
import { AccountPasswordResetEntity } from './entities/account-password-reset.entity';
import { AccountEntity } from './entities/account.entity';
import { AccountVerificationAttemptEntity } from './entities/account-verification-attempt.entity';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountInactivityScheduler } from './account-inactivity.scheduler';

@Module({
  imports: [
    CqrsModule,
    MikroOrmModule.forFeature([
      AccountEntity,
      AccountEmailVerificationEntity,
      AccountPasswordResetEntity,
      AccountVerificationAttemptEntity,
    ]),
    NotificationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get('auth.jwt', { infer: true })!;
        return {
          secret: jwtConfig.accessSecret,
          signOptions: {
            expiresIn: jwtConfig.accessTtlSeconds,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    ...CommandHandlers,
    EmailVerificationService,
    PasswordResetService,
    JwtAuthGuard,
    AccountInactivityScheduler,
  ],
})
export class AccountsModule {}
