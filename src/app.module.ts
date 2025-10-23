import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChecksumModule } from './common/security/checksum.module';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import mailConfig from './config/mail.config';
import adminConfig from './config/admin.config';
import { AccountsModule } from './modules/accounts/accounts.module';
import { MikroOrmEntityManagerCleanupInterceptor } from './common/interceptors/mikro-orm-entity-manager-cleanup.interceptor';
import { MikroOrmRequestContextMiddleware } from './common/middleware/mikro-orm-request-context.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PodsModule } from './modules/pods/pods.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { AdminModule } from './modules/admin/admin.module';
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [databaseConfig, authConfig, mailConfig, adminConfig],
    }),
    CqrsModule,
    ChecksumModule,
    MikroOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbOptions = configService.get('database', { infer: true })!;
        return {
          ...dbOptions,
          registerRequestContext: false,
          allowGlobalContext: false,
        };
      },
    }),
    NotificationsModule,
    AchievementsModule,
    AccountsModule,
    PodsModule,
    FinanceModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MikroOrmEntityManagerCleanupInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware, MikroOrmRequestContextMiddleware)
      .forRoutes('*');
  }
}
