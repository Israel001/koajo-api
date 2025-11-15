import type { InAppNotificationPayload } from './in-app-notification.service';

type MessageFactory = () => InAppNotificationPayload;

export const InAppNotificationMessages: Record<string, MessageFactory> = {
  joinedPod: () => ({
    title: 'Joined a pod',
    body: 'You have joined a new pod',
    severity: 'info',
  }),
  contributionDue: () => ({
    title: 'Contribution payment due',
    body: 'Your Koajo pod contribution payments are due soon. Koajo auto drafts on the 1st and 16th.',
    severity: 'warning',
  }),
  contributionSuccessful: () => ({
    title: 'Contribution successful',
    body: 'Your Koajo pod contribution payment was successful',
    severity: 'success',
  }),
  contributionFailed: () => ({
    title: 'Contribution failed',
    body: 'Your Koajo pod contribution payment failed',
    severity: 'danger',
  }),
  payoutSuccessful: () => ({
    title: 'Payout successful',
    body: 'You should have received a payout',
    severity: 'success',
  }),
  achievementEarned: () => ({
    title: 'Achievement earned',
    body: 'New Koajo Badge earned',
    severity: 'success',
  }),
  rapidJoinerAlert: () => ({
    title: 'Rapid joiner alert triggered',
    body: 'You joined too many pods and initiated a cool down',
    severity: 'warning',
  }),
  podCycleCompleted: () => ({
    title: 'Pod cycle completed successfully',
    body: 'Rockstar! You completed a full pod cycle, keep the momentum going',
    severity: 'success',
  }),
  bankLinked: () => ({
    title: 'Bank account linked',
    body: 'You linked your contribution bank account. See linked bank account in dashboard',
    severity: 'info',
  }),
  bankRemoved: () => ({
    title: 'Bank account removed',
    body: 'You unlinked a bank account',
    severity: 'warning',
  }),
};

export type InAppNotificationMessageKey = keyof typeof InAppNotificationMessages;
