import { ListAccountPodActivitiesHandler } from './list-account-pod-activities.handler';
import { ListAccountPodActivitiesQuery } from '../list-account-pod-activities.query';
import { PodActivityType } from '../../pod-activity-type.enum';

describe('ListAccountPodActivitiesHandler', () => {
  let handler: ListAccountPodActivitiesHandler;
  let membershipRepository: { find: jest.Mock };
  let activityRepository: { findAndCount: jest.Mock };

  beforeEach(() => {
    membershipRepository = {
      find: jest.fn(),
    } as any;

    activityRepository = {
      findAndCount: jest.fn(),
    } as any;

    handler = new ListAccountPodActivitiesHandler(
      membershipRepository as any,
      activityRepository as any,
    );
  });

  it('returns empty result when the account has no pod memberships', async () => {
    membershipRepository.find.mockResolvedValue([]);

    const result = await handler.execute(
      new ListAccountPodActivitiesQuery('account-1', 25, 0),
    );

    expect(result).toEqual({ total: 0, items: [] });
    expect(activityRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('returns mapped activities across all pods', async () => {
    membershipRepository.find.mockResolvedValue([
      { pod: { id: 'pod-1' } },
      { pod: { id: 'pod-2' } },
    ]);

    activityRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'activity-1',
          type: PodActivityType.MEMBER_JOINED,
          metadata: null,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          account: {
            id: 'account-2',
            email: 'member@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            avatarUrl: 'https://example.com/avatar.png',
          },
        },
        {
          id: 'activity-2',
          type: PodActivityType.CONTRIBUTION_RECORDED,
          metadata: { amount: '100.00' },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
          account: null,
        },
      ],
      2,
    ]);

    const result = await handler.execute(
      new ListAccountPodActivitiesQuery('account-1', 25, 10),
    );

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'activity-1',
      type: PodActivityType.MEMBER_JOINED,
      actor: {
        accountId: 'account-2',
        avatarUrl: 'https://example.com/avatar.png',
      },
    });
    expect(activityRepository.findAndCount).toHaveBeenCalledWith(
      { pod: { id: { $in: ['pod-1', 'pod-2'] } } },
      expect.objectContaining({
        limit: expect.any(Number),
        offset: expect.any(Number),
      }),
    );
  });
});
