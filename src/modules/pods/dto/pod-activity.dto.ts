import { ApiProperty } from '@nestjs/swagger';
import { PodActivityType } from '../pod-activity-type.enum';
import type {
  PodActivityActorSummary,
  PodActivitySummary,
  PodActivitiesListResult,
} from '../contracts/pod-activity-summary';

class PodActivityActorDto implements PodActivityActorSummary {
  @ApiProperty({ description: 'Identifier of the account that triggered the activity.' })
  accountId!: string;

  @ApiProperty({
    description: 'Email address of the actor, if available.',
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({
    description: 'First name of the actor, if available.',
    nullable: true,
  })
  firstName!: string | null;

  @ApiProperty({
    description: 'Last name of the actor, if available.',
    nullable: true,
  })
  lastName!: string | null;
}

export class PodActivityDto implements PodActivitySummary {
  @ApiProperty({ description: 'Activity identifier.' })
  id!: string;

  @ApiProperty({ enum: PodActivityType, description: 'Type of activity.' })
  type!: PodActivityType;

  @ApiProperty({
    description: 'Additional metadata attached to the activity.',
    nullable: true,
    type: Object,
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({
    description: 'ISO timestamp when the activity occurred.',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Account details for the actor, if available.',
    type: () => PodActivityActorDto,
    nullable: true,
  })
  actor!: PodActivityActorSummary | null;
}

export class PodActivityListResultDto implements PodActivitiesListResult {
  @ApiProperty({
    description: 'Total number of activities that match the query.',
  })
  total!: number;

  @ApiProperty({
    description: 'Activities for the requested page.',
    type: [PodActivityDto],
  })
  items!: PodActivityDto[];
}
