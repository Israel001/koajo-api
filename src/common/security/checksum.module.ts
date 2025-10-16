import { Global, Module } from '@nestjs/common';
import { ChecksumService } from './checksum.service';

@Global()
@Module({
  providers: [ChecksumService],
  exports: [ChecksumService],
})
export class ChecksumModule {}
