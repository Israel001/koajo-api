import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CqrsModule } from '@nestjs/cqrs';
import { AchievementEntity } from './entities/achievement.entity';
import { AccountAchievementEntity } from './entities/account-achievement.entity';
import { AchievementService } from './achievements.service';
import { AccountEntity } from '../accounts/entities/account.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GetAchievementsSummaryHandler } from './queries/handlers/get-achievements-summary.handler';
import { AchievementsController } from './achievements.controller';
import { JwtAuthGuard } from '../accounts/guards/jwt-auth.guard';
import { PodMembershipEntity } from '../pods/entities/pod-membership.entity';
import { PodEntity } from '../pods/entities/pod.entity';
import { PodInviteEntity } from '../pods/entities/pod-invite.entity';
import { PaymentEntity } from '../finance/entities/payment.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      AchievementEntity,
      AccountAchievementEntity,
      AccountEntity,
      PodMembershipEntity,
      PodEntity,
      PodInviteEntity,
      PaymentEntity,
    ]),
    CqrsModule,
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
  controllers: [AchievementsController],
  providers: [AchievementService, GetAchievementsSummaryHandler, JwtAuthGuard],
  exports: [AchievementService],
})
export class AchievementsModule {}
