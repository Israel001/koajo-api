import type { Loaded } from '@mikro-orm/core';
import { PodEntity } from './entities/pod.entity';
import { PodMembershipEntity } from './entities/pod-membership.entity';

export type PodWithMembers = Loaded<
  PodEntity,
  'memberships' | 'memberships.account'
>;

export type MembershipWithPod = Loaded<
  PodMembershipEntity,
  'pod' | 'pod.memberships' | 'pod.memberships.account'
>;
