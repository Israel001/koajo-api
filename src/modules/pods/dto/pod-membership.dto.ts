import { ApiProperty } from '@nestjs/swagger';
import { PodStatus } from '../pod-status.enum';
import { PodMemberSlotDto } from './pod-member-slot.dto';
import { PodGoalType } from '../pod-goal.enum';
import { PodType } from '../pod-type.enum';
import { CustomPodCadence } from '../custom-pod-cadence.enum';

export class PodMembershipDto {
  @ApiProperty({ description: 'Unique identifier for the pod.' })
  podId!: string;

  @ApiProperty({ description: 'Pod plan code.', example: '100-12' })
  planCode!: string;

  @ApiProperty({ description: 'Friendly name for the pod.', nullable: true })
  name!: string | null;

  @ApiProperty({ description: 'Contribution amount per cycle.', example: 100 })
  amount!: number;

  @ApiProperty({ description: 'Total lifecycle length in weeks.', example: 12 })
  lifecycleWeeks!: number;

  @ApiProperty({ description: 'Maximum members in the pod.', example: 6 })
  maxMembers!: number;

  @ApiProperty({ enum: PodStatus })
  status!: PodStatus;

  @ApiProperty({ enum: PodType, description: 'Type of pod (system or custom).' })
  podType!: PodType;

  @ApiProperty({ enum: CustomPodCadence, nullable: true, description: 'Cadence for custom pods.' })
  cadence!: CustomPodCadence | null;

  @ApiProperty({ description: 'Indicates if custom pod payout order is randomized.', nullable: true })
  randomizePositions!: boolean | null;

  @ApiProperty({ description: 'Expected number of members when the pod is full (custom pods).', nullable: true })
  expectedMemberCount!: number | null;

  @ApiProperty({ description: 'ISO datetime when the pod is scheduled to start.', nullable: true })
  scheduledStartDate!: string | null;

  @ApiProperty({ description: 'ISO datetime when contributions begin.', nullable: true })
  startDate!: string | null;

  @ApiProperty({ description: 'ISO datetime when the grace period ends.', nullable: true })
  graceEndsAt!: string | null;

  @ApiProperty({ description: 'ISO datetime when the pod locked.', nullable: true })
  lockedAt!: string | null;

  @ApiProperty({ description: 'Order in the payout schedule for the requesting account.', nullable: true })
  payoutOrder!: number | null;

  @ApiProperty({ description: 'Scheduled payout date for the requesting account.', nullable: true })
  payoutDate!: string | null;

  @ApiProperty({ description: 'Members ahead of the requester in payout order.', type: [PodMemberSlotDto], nullable: true })
  aheadOfYou!: PodMemberSlotDto[] | null;

  @ApiProperty({ description: 'Members behind the requester in payout order.', type: [PodMemberSlotDto], nullable: true })
  behindYou!: PodMemberSlotDto[] | null;

  @ApiProperty({ description: 'All members ordered by payout slots (visible once the pod locks).', type: [PodMemberSlotDto], nullable: true })
  orderedMembers!: PodMemberSlotDto[] | null;

  @ApiProperty({ enum: PodGoalType, nullable: true, required: false })
  goalType!: PodGoalType | null;

  @ApiProperty({ description: 'Custom goal details when goalType is other.', nullable: true })
  goalNote!: string | null;

  @ApiProperty({ description: 'Total amount contributed by the member so far.', example: '0.00', nullable: true })
  totalContributed!: string | null;

  @ApiProperty({ description: 'Total amount the member is expected to contribute through the pod lifecycle.', example: '1200.00' })
  totalContributionTarget!: string;

  @ApiProperty({ description: 'Percentage of the total contribution that has been fulfilled.', example: 25 })
  contributionProgress!: number;

  @ApiProperty({ description: 'The next payout date for this pod.', nullable: true, example: '2025-02-15T00:00:00.000Z' })
  nextPayoutDate!: string | null;

  @ApiProperty({ description: 'The upcoming contribution window start date.', nullable: true })
  nextContributionDate!: string | null;
}
