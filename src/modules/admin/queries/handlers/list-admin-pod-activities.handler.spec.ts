import { NotFoundException } from '@nestjs/common';
import { ListAdminPodActivitiesHandler } from './list-admin-pod-activities.handler';
import { ListAdminPodActivitiesQuery } from '../list-admin-pod-activities.query';
import { PodActivityType } from '../../../pods/pod-activity-type.enum';

describe('ListAdminPodActivitiesHandler', () => {
  let handler: ListAdminPodActivitiesHandler;
  let podRepository: { findOne: jest.Mock };
  let activityRepository: { find: jest.Mock };

  beforeEach(() => {
    podRepository = {
      findOne: jest.fn(),
    } as any;
    activityRepository = {
      find: jest.fn(),
    } as any;

    handler = new ListAdminPodActivitiesHandler(
      podRepository as any,
      activityRepository as any,
    );
  });

  it('throws when pod is not found', async () => {
    podRepository.findOne.mockResolvedValue(null);

    await expect(
      handler.execute(new ListAdminPodActivitiesQuery('pod-1', 50)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(podRepository.findOne).toHaveBeenCalledWith({ id: 'pod-1' });
  });

  it('returns activities when pod exists', async () => {
    const pod = { id: 'pod-1' };
    podRepository.findOne.mockResolvedValue(pod);
    activityRepository.find.mockResolvedValue([
      {
        id: 'activity-1',
        type: PodActivityType.POD_CREATED,
        metadata: { cadence: 'bi-weekly' },
        createdAt: new Date('2025-01-03T00:00:00.000Z'),
        account: null,
      },
    ]);

    const result = await handler.execute(
      new ListAdminPodActivitiesQuery('pod-1', 10),
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(PodActivityType.POD_CREATED);
    expect(activityRepository.find).toHaveBeenCalledWith(
      { pod },
      expect.objectContaining({ limit: expect.any(Number) }),
    );
  });
});
