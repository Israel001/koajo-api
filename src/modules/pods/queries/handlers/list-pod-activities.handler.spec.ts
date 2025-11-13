import { NotFoundException } from '@nestjs/common';
import { ListPodActivitiesHandler } from './list-pod-activities.handler';
import { ListPodActivitiesQuery } from '../list-pod-activities.query';
import { PodActivityType } from '../../pod-activity-type.enum';

describe('ListPodActivitiesHandler', () => {
  let handler: ListPodActivitiesHandler;
  let membershipRepository: { findOne: jest.Mock };
  let activityRepository: { findAndCount: jest.Mock };

  beforeEach(() => {
    membershipRepository = {
      findOne: jest.fn(),
    } as any;

    activityRepository = {
      findAndCount: jest.fn(),
    } as any;

    handler = new ListPodActivitiesHandler(
      membershipRepository as any,
      activityRepository as any,
    );
  });

  it('throws when membership does not exist for the account', async () => {
    membershipRepository.findOne.mockResolvedValue(null);

    await expect(
      handler.execute(new ListPodActivitiesQuery('pod-1', 'account-1', 20)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(membershipRepository.findOne).toHaveBeenCalled();
  });

  it('returns mapped activities for the pod', async () => {
    membershipRepository.findOne.mockResolvedValue({ id: 'membership-1' });
    activityRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'activity-1',
          type: PodActivityType.MEMBER_JOINED,
          metadata: { joinOrder: 1 },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          account: {
            id: 'account-1',
            email: 'member@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            avatarUrl: 'https://example.com/avatar.png',
          },
        },
        {
          id: 'activity-2',
          type: PodActivityType.CONTRIBUTION_RECORDED,
          metadata: null,
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
          account: null,
        },
      ],
      2,
    ]);

    const result = await handler.execute(
      new ListPodActivitiesQuery('pod-1', 'account-1', 20),
    );

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'activity-1',
      type: PodActivityType.MEMBER_JOINED,
      actor: {
        accountId: 'account-1',
        avatarUrl: 'https://example.com/avatar.png',
      },
    });
    expect(result.items[1].actor).toBeNull();
    expect(activityRepository.findAndCount).toHaveBeenCalledWith(
      { pod: 'pod-1' },
      expect.objectContaining({
        limit: expect.any(Number),
        offset: expect.any(Number),
      }),
    );
  });
});
