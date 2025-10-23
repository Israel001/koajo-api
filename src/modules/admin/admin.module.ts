import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminUserEntity } from './entities/admin-user.entity';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAccountsController } from './controllers/admin-accounts.controller';
import { AdminPodsController } from './controllers/admin-pods.controller';
import { AdminCommandHandlers } from './commands/handlers';
import { AdminQueryHandlers } from './queries/handlers';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AccountEntity } from '../accounts/entities/account.entity';
import { PodEntity } from '../pods/entities/pod.entity';
import { PodMembershipEntity } from '../pods/entities/pod-membership.entity';
import { PodPlanEntity } from '../pods/entities/pod-plan.entity';
import { AchievementsModule } from '../achievements/achievements.module';
import { AchievementEntity } from '../achievements/entities/achievement.entity';
import { PaymentEntity } from '../finance/entities/payment.entity';
import { PayoutEntity } from '../finance/entities/payout.entity';
import { TransactionEntity } from '../finance/entities/transaction.entity';
import { AccountVerificationAttemptEntity } from '../accounts/entities/account-verification-attempt.entity';
import { AdminAchievementsController } from './controllers/admin-achievements.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';

@Module({
  imports: [
    CqrsModule,
    MikroOrmModule.forFeature([
      AdminUserEntity,
      AccountEntity,
      PodEntity,
      PodMembershipEntity,
      PodPlanEntity,
      AchievementEntity,
      PaymentEntity,
      PayoutEntity,
      TransactionEntity,
      AccountVerificationAttemptEntity,
    ]),
    AchievementsModule,
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
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminAccountsController,
    AdminPodsController,
    AdminAchievementsController,
    AdminDashboardController,
  ],
  providers: [...AdminCommandHandlers, ...AdminQueryHandlers, AdminJwtGuard],
})
export class AdminModule {}
