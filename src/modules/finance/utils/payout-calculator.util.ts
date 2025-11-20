import { PodMembershipEntity } from '../../pods/entities/pod-membership.entity';

const DEFAULT_FEE_RATE = 0.025;

export function calculateNetPayout(membership: PodMembershipEntity): string {
  const gross = calculateGrossPayout(membership);
  const deductionRate = getDeductionRate(membership);
  const net = gross * (1 - deductionRate);
  return net.toFixed(2);
}

export function calculateGrossPayout(membership: PodMembershipEntity): number {
  if (membership.payoutAmount) {
    return Number.parseFloat(membership.payoutAmount);
  }
  const pod = membership.pod;
  const lifecycleWeeks = Math.max(pod.lifecycleWeeks ?? 0, 0);
  const cycles = Math.max(Math.ceil(lifecycleWeeks / 2), 1);
  return pod.amount * cycles;
}

export function getDeductionRate(membership: PodMembershipEntity): number {
  const pod = membership.pod;
  const totalMembers = pod.maxMembers ?? pod.memberships?.length ?? null;
  const position = getPayoutPosition(membership);
  if (!totalMembers || !position) {
    return DEFAULT_FEE_RATE;
  }
  if (position === totalMembers) {
    return 0;
  }
  if (position === totalMembers - 1) {
    return 0.015;
  }
  return DEFAULT_FEE_RATE;
}

export function getPayoutPosition(
  membership: PodMembershipEntity,
): number | null {
  if (typeof membership.finalOrder === 'number') {
    return membership.finalOrder;
  }
  if (typeof membership.joinOrder === 'number' && membership.joinOrder > 0) {
    return membership.joinOrder;
  }
  return null;
}
