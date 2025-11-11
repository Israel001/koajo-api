import { PodEntity } from './entities/pod.entity';
import { PodType } from './pod-type.enum';
import { CustomPodCadence } from './custom-pod-cadence.enum';

const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const buildPodConfirmationDetails = (pod: PodEntity): {
  podAmount: string;
  podMembers: string;
  podCycle: string;
  isCustom: boolean;
} => {
  const podAmount = amountFormatter.format(pod.amount ?? 0);
  const members =
    pod.expectedMemberCount ?? pod.maxMembers ?? pod.memberships.length ?? 0;
  const podMembers = String(members);

  let podCycle = 'Flexible cycle';
  if (pod.cadence) {
    podCycle =
      pod.cadence === CustomPodCadence.MONTHLY
        ? 'Monthly cadence'
        : 'Bi-weekly cadence';
  } else if (pod.lifecycleWeeks) {
    podCycle = `${pod.lifecycleWeeks} week${pod.lifecycleWeeks === 1 ? '' : 's'}`;
  }

  return {
    podAmount,
    podMembers,
    podCycle,
    isCustom: pod.type === PodType.CUSTOM,
  };
};
