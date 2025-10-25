import { PartialType } from '@nestjs/swagger';
import { CreatePodPlanDto } from './create-pod-plan.dto';

export class UpdatePodPlanDto extends PartialType(CreatePodPlanDto) {}
