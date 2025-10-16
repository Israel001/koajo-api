import { ApiProperty } from '@nestjs/swagger';
import { AchievementCode } from '../achievement-code.enum';

class EarnedAchievementDto {
  @ApiProperty({ enum: AchievementCode })
  code!: AchievementCode;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: 'ISO datetime when the achievement was awarded.' })
  awardedAt!: string;
}

class PendingAchievementDto {
  @ApiProperty({ enum: AchievementCode })
  code!: AchievementCode;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: 'Progress towards the achievement (0-1).' })
  progress!: number;

  @ApiProperty({ description: 'Number of actions remaining before unlocking.' })
  remaining!: number;
}

export class AchievementsSummaryDto {
  @ApiProperty({ description: 'Total number of achievements earned.' })
  totalEarned!: number;

  @ApiProperty({ description: 'Total number of achievements available.' })
  totalAvailable!: number;

  @ApiProperty({ description: 'List of achievements earned.', type: [EarnedAchievementDto] })
  earned!: EarnedAchievementDto[];

  @ApiProperty({ description: 'Pending achievements ordered by proximity.', type: [PendingAchievementDto] })
  pending!: PendingAchievementDto[];
}
