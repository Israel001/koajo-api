import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PaymentsController } from './controllers/payments.controller';
import { PayoutsController } from './controllers/payouts.controller';
import { PaymentEntity } from './entities/payment.entity';
import { PayoutEntity } from './entities/payout.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { FinanceCommandHandlers } from './commands/handlers';
import { PodMembershipEntity } from '../pods/entities/pod-membership.entity';
import { PodEntity } from '../pods/entities/pod.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { JwtAuthGuard } from '../accounts/guards/jwt-auth.guard';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      PaymentEntity,
      PayoutEntity,
      TransactionEntity,
      PodMembershipEntity,
      PodEntity,
      AccountEntity,
    ]),
    CqrsModule,
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
  controllers: [PaymentsController, PayoutsController],
  providers: [...FinanceCommandHandlers, JwtAuthGuard],
})
export class FinanceModule {}
