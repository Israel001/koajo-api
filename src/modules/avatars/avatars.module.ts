import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AvatarsController } from './avatars.controller';
import { AvatarEntity } from './entities/avatar.entity';
import { ListAvatarsHandler } from './queries/handlers/list-avatars.handler';

@Module({
  imports: [CqrsModule, MikroOrmModule.forFeature([AvatarEntity])],
  controllers: [AvatarsController],
  providers: [ListAvatarsHandler],
})
export class AvatarsModule {}
