import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PodEntity } from './entities/pod.entity';
import { PodMembershipEntity } from './entities/pod-membership.entity';
import { PodPlanEntity } from './entities/pod-plan.entity';
import { PodDomainHelper } from './pod-domain.helper';
import { PodsController } from './pods.controller';
import { AccountEntity } from '../accounts/entities/account.entity';
import { JwtAuthGuard } from '../accounts/guards/jwt-auth.guard';
import { PodsScheduler } from './pods.scheduler';
import { PodCommandHandlers } from './commands/handlers';
import { PodQueryHandlers } from './queries/handlers';
import { AchievementsModule } from '../achievements/achievements.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PodInviteEntity } from './entities/pod-invite.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      PodEntity,
      PodMembershipEntity,
      PodPlanEntity,
      PodInviteEntity,
      AccountEntity,
    ]),
    CqrsModule,
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
  controllers: [PodsController],
  providers: [
    PodDomainHelper,
    JwtAuthGuard,
    PodsScheduler,
    ...PodCommandHandlers,
    ...PodQueryHandlers,
  ],
  exports: [PodDomainHelper],
})
export class PodsModule {}
