import { ApiProperty } from '@nestjs/swagger';
import type { UserFinanceSummary } from './finance-summary';

export class UserFinanceSummaryDto implements UserFinanceSummary {
  @ApiProperty({ description: 'Total contributions across all pods (lifetime).' })
  totalContributions!: string;

  @ApiProperty({ description: 'Total payouts received across all pods (lifetime).' })
  totalPayouts!: string;
}
