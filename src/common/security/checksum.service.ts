import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

type Primitive = string | number | boolean | bigint | null | undefined;

@Injectable()
export class ChecksumService {
  private readonly secret: string;
  private readonly algorithm: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('CHECKSUM_SECRET') ??
      this.configService.get<string>('checksum.secret') ??
      'koajo-checksum';
    this.algorithm =
      this.configService.get<string>('CHECKSUM_ALGORITHM') ??
      this.configService.get<string>('checksum.algorithm') ??
      'sha256';
  }

  generate(context: string, ...fields: Primitive[]): string {
    const payload = [context, ...fields]
      .map((value) => {
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      })
      .join('|');

    return createHmac(this.algorithm, this.secret)
      .update(payload)
      .digest('hex');
  }

  verify(checksum: string, context: string, ...fields: Primitive[]): boolean {
    return this.generate(context, ...fields) === checksum;
  }
}
