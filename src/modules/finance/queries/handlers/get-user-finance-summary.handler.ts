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
    const totalContributions = await this.sumColumn(
      this.paymentRepository,
      { account: query.accountId },
      'payments',
      'amount',
    );

    const totalPayouts = await this.sumColumn(
      this.payoutRepository,
      { account: query.accountId },
      'payouts',
      'amount',
    );

    return {
      totalContributions,
      totalPayouts,
    };
  }

  private async sumColumn(
    repo: EntityRepository<any>,
    where: Record<string, unknown>,
    tableName: string,
    column: string,
  ): Promise<string> {
    const alias = repo.getEntityName().toLowerCase();
    const conditions: string[] = [];
    const params: any = {};
    Object.entries(where).forEach(([key, value], idx) => {
      const param = `w${idx}`;
      conditions.push(`${alias}.${key} = :${param}`);
      params[param] = value;
    });
    const whereSql = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    const sql = `SELECT COALESCE(SUM(${alias}.${column}), 0) as total FROM ${tableName} ${alias} ${whereSql}`;
    const result = (await repo
      .getEntityManager()
      .getConnection()
      .execute(sql, params)) as Array<{
      total: string | number | null;
    }>;
    const totalVal = result[0]?.total ?? 0;
    const numeric =
      typeof totalVal === 'number' ? totalVal : Number(totalVal ?? 0);
    return numeric.toFixed(2);
  }
}
