import { ApiProperty } from '@nestjs/swagger';
import { PodPlanDefinition } from '../pod.constants';

export class PodPlanDto implements PodPlanDefinition {
  @ApiProperty({ example: '100-12' })
  code!: string;

  @ApiProperty({ example: 100 })
  amount!: number;

  @ApiProperty({ example: 12 })
  lifecycleWeeks!: number;

  @ApiProperty({ example: 6 })
  maxMembers!: number;

  @ApiProperty({ description: 'Indicates whether the plan is active.', example: true })
  active!: boolean;
}
