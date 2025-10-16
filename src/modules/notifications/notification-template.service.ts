import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { replaceTemplateVariables } from './template.utils';

@Injectable()
export class NotificationTemplateService {
  private readonly cache = new Map<string, string>();

  constructor(
    @InjectRepository(NotificationTemplateEntity)
    private readonly templateRepository: EntityRepository<NotificationTemplateEntity>,
  ) {}

  async getTemplateBody(code: string): Promise<string> {
    const normalizedCode = code.trim().toLowerCase();

    if (this.cache.has(normalizedCode)) {
      return this.cache.get(normalizedCode)!;
    }

    const template = await this.templateRepository.findOne({
      code: normalizedCode,
    });
    if (!template) {
      throw new NotFoundException(`Notification template '${code}' not found.`);
    }

    this.cache.set(normalizedCode, template.body);
    return template.body;
  }

  async render(code: string, variables: Record<string, string | number>): Promise<string> {
    const body = await this.getTemplateBody(code);
    return replaceTemplateVariables(body, variables);
  }

  invalidate(code?: string) {
    if (!code) {
      this.cache.clear();
      return;
    }

    this.cache.delete(code.trim().toLowerCase());
  }
}
