import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { PodEntity } from '../../pods/entities/pod.entity';
import { PodMembershipEntity } from '../../pods/entities/pod-membership.entity';

@Entity({ tableName: 'payments' })
export class PaymentEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => AccountEntity, { nullable: false })
  account!: AccountEntity;

  @ManyToOne(() => PodEntity, { nullable: false })
  pod!: PodEntity;

  @ManyToOne(() => PodMembershipEntity, {
    nullable: false,
    deleteRule: 'cascade',
  })
  membership!: PodMembershipEntity;

  @Property({ columnType: 'varchar(128)', unique: true })
  stripeReference!: string;

  @Property({ columnType: 'decimal(15,2)' })
  amount!: string;

  @Property({ columnType: 'varchar(16)' })
  currency!: string;

  @Property({ columnType: 'varchar(64)' })
  status!: string;

  @Property({ columnType: 'varchar(255)', nullable: true })
  description?: string | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();
}
