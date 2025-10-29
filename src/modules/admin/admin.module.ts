import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminUserEntity } from './entities/admin-user.entity';
import { AdminRoleEntity } from './entities/admin-role.entity';
import { AdminPermissionEntity } from './entities/admin-permission.entity';
import { AdminUserPermissionOverrideEntity } from './entities/admin-user-permission-override.entity';
import { AdminPasswordResetEntity } from './entities/admin-password-reset.entity';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAccountsController } from './controllers/admin-accounts.controller';
import { AdminPodsController } from './controllers/admin-pods.controller';
import { AdminPodPlansController } from './controllers/admin-pod-plans.controller';
import { AdminCommandHandlers } from './commands/handlers';
import { AdminQueryHandlers } from './queries/handlers';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminPermissionsGuard } from './guards/admin-permissions.guard';
import { AccountEntity } from '../accounts/entities/account.entity';
import { PodEntity } from '../pods/entities/pod.entity';
import { PodMembershipEntity } from '../pods/entities/pod-membership.entity';
import { PodPlanEntity } from '../pods/entities/pod-plan.entity';
import { PodActivityEntity } from '../pods/entities/pod-activity.entity';
import { AchievementsModule } from '../achievements/achievements.module';
import { AchievementEntity } from '../achievements/entities/achievement.entity';
import { PaymentEntity } from '../finance/entities/payment.entity';
import { PayoutEntity } from '../finance/entities/payout.entity';
import { TransactionEntity } from '../finance/entities/transaction.entity';
import { AccountVerificationAttemptEntity } from '../accounts/entities/account-verification-attempt.entity';
import { AdminAchievementsController } from './controllers/admin-achievements.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminPodPlanService } from './services/admin-pod-plan.service';
import { AdminAccessService } from './services/admin-access.service';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminPermissionsController } from './controllers/admin-permissions.controller';
import { AdminPasswordResetService } from './services/admin-password-reset.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    CqrsModule,
    MikroOrmModule.forFeature([
      AdminUserEntity,
      AdminRoleEntity,
      AdminPermissionEntity,
      AdminUserPermissionOverrideEntity,
      AdminPasswordResetEntity,
      AccountEntity,
      PodEntity,
      PodMembershipEntity,
      PodPlanEntity,
      PodActivityEntity,
      AchievementEntity,
      PaymentEntity,
      PayoutEntity,
      TransactionEntity,
      AccountVerificationAttemptEntity,
    ]),
    AchievementsModule,
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
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminAccountsController,
    AdminPodsController,
    AdminPodPlansController,
    AdminAchievementsController,
    AdminDashboardController,
    AdminRolesController,
    AdminPermissionsController,
  ],
  providers: [
    ...AdminCommandHandlers,
    ...AdminQueryHandlers,
    AdminJwtGuard,
    AdminPermissionsGuard,
    AdminPodPlanService,
    AdminAccessService,
    AdminPasswordResetService,
  ],
})
export class AdminModule {}
