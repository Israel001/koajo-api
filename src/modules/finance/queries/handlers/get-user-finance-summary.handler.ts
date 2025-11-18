import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PaymentEntity } from '../../entities/payment.entity';
import { PayoutEntity } from '../../entities/payout.entity';
import { GetUserFinanceSummaryQuery } from '../get-user-finance-summary.query';
import type { UserFinanceSummary } from '../../contracts/finance-summary';

@QueryHandler(GetUserFinanceSummaryQuery)
export class GetUserFinanceSummaryHandler
  implements IQueryHandler<GetUserFinanceSummaryQuery, UserFinanceSummary>
{
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
  ) {}

  async execute(
    query: GetUserFinanceSummaryQuery,
  ): Promise<UserFinanceSummary> {
    const totalContributions = await this.sumTable(
      'payments',
      query.accountId,
      'amount',
    );

    const totalPayouts = await this.sumTable(
      'payouts',
      query.accountId,
      'amount',
    );

    return {
      totalContributions,
      totalPayouts,
    };
  }

  private async sumTable(
    tableName: string,
    accountId: string,
    column: string,
  ): Promise<string> {
    const em = this.paymentRepository.getEntityManager();
    const rows = (await em.getConnection().execute(
      `SELECT COALESCE(SUM(${column}), 0) as total FROM ${tableName} WHERE account_id = ?`,
      [accountId],
    )) as Array<{ total: string | number | null }>;
    const totalVal = rows[0]?.total ?? 0;
    const numeric =
      typeof totalVal === 'number' ? totalVal : Number(totalVal ?? 0);
    return numeric.toFixed(2);
  }
}
