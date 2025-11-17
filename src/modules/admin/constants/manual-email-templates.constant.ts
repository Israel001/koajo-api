export interface ManualEmailTemplateVariable {
  key: string;
  label: string;
  required: boolean;
}

export interface ManualEmailTemplateDefinition {
  code: string;
  name: string;
  subject: string;
  description: string;
  variables: ManualEmailTemplateVariable[];
}

export const MANUAL_EMAIL_TEMPLATES: ManualEmailTemplateDefinition[] = [
  {
    code: 'stripe_user_triggered_dispute',
    name: 'Stripe user-triggered dispute',
    subject: "We've received your dispute request",
    description:
      'Notifies a customer that they initiated a dispute directly with Stripe and outlines next steps.',
    variables: [
      { key: 'firstName', label: 'First name', required: true },
      { key: 'amount', label: 'Dispute amount', required: true },
      { key: 'date', label: 'Dispute date', required: true },
      { key: 'transactionId', label: 'Transaction reference', required: true },
    ],
  },
  {
    code: 'stripe_triggered_dispute',
    name: 'Stripe triggered dispute',
    subject: 'Stripe flagged a dispute on your account',
    description:
      'Alerts a customer that Stripe triggered a dispute review on their behalf.',
    variables: [{ key: 'firstName', label: 'First name', required: true }],
  },
  {
    code: 'payout_issue_resolved',
    name: 'Payout issue resolved',
    subject: 'Your Koajo payout issue has been resolved',
    description:
      'Confirms to a customer that a previously reported payout issue has been addressed.',
    variables: [
      { key: 'amount', label: 'Payout amount', required: true },
      { key: 'bankName', label: 'Bank name', required: true },
    ],
  },
  {
    code: 'payout_delay',
    name: 'Payout delay',
    subject: 'Update on your Koajo payout',
    description:
      'Explains that a customer payout has been delayed and provides the affected date.',
    variables: [
      { key: 'date', label: 'Scheduled payout date', required: true },
      {
        key: 'reasons',
        label: 'Comma-separated payout delay reasons (will render as bullet list)',
        required: false,
      },
    ],
  },
  {
    code: 'missed_payout',
    name: 'Missed payout',
    subject: 'Action required: missed payout',
    description:
      'Informs a customer that a payout was missed and outlines corrective steps.',
    variables: [],
  },
  {
    code: 'dispute_acknowledgement',
    name: 'Dispute acknowledgement',
    subject: "We've acknowledged your dispute",
    description:
      'Acknowledges receipt of a customer dispute and sets expectations for follow-up.',
    variables: [{ key: 'firstName', label: 'First name', required: true }],
  },
  {
    code: 'account_closure_for_compliance',
    name: 'Account closure for compliance',
    subject: 'Important: account closure for compliance',
    description:
      'Notifies a customer that their account has been closed to maintain compliance obligations.',
    variables: [],
  },
];

export const MANUAL_EMAIL_TEMPLATE_MAP = new Map(
  MANUAL_EMAIL_TEMPLATES.map((template) => [template.code, template]),
);
