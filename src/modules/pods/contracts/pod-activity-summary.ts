import { PodActivityType } from '../pod-activity-type.enum';

export interface PodActivityActorSummary {
  accountId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface PodActivitySummary {
  id: string;
  type: PodActivityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: PodActivityActorSummary | null;
}

export interface PodActivitiesListResult {
  total: number;
  items: PodActivitySummary[];
}
