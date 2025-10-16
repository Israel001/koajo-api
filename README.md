# Koajo API

NestJS boilerplate configured with CQRS, MikroORM, and MySQL for fintech-grade workflows. The template emphasizes request isolation, deterministic integrity checks, and clear separation between commands and queries, while leaving the domain layer open for you to plug in.

## Getting Started

```bash
pnpm install
cp .env.example .env
pnpm run start:dev
```

Default credentials expect a local MySQL instance. Update `.env` as needed and ensure the target database exists before booting the app.

> **Native dependency notice**: `argon2` needs build-script approval the first time you install dependencies. Run `pnpm approve-builds` and allow the package when prompted (or re-run with the `--recursive` flag in CI) before executing scripts that depend on it.

## Project Highlights

- **CQRS-ready**: `CqrsModule` is wired in globally so new feature modules can register commands, events, and queries immediately.
- **MikroORM + MySQL**: Configured through `ConfigModule` with CLI support via `mikro-orm.config.ts` and scripts for migration management.
- **Request-scoped entity managers**: `MikroOrmRequestContextMiddleware` and a cleanup interceptor guard against the context lock issues that surface after failed transactions.
- **Integrity checksums**: `ChecksumService` signs persisted account state and verification codes so stale data is easier to detect.

## Available Scripts

```bash
pnpm run start        # Boot in production mode
pnpm run start:dev    # Watch mode
pnpm run migration:generate  # Generate MikroORM migration
pnpm run migration:up/down   # Apply or revert migrations
pnpm run test         # Unit tests
pnpm run test:e2e     # E2E tests
```

## Next Steps

1. Create a MySQL database that matches the `.env` configuration.
2. Generate an initial migration (`pnpm run migration:generate`) and apply it (`pnpm run migration:up`).
3. Scaffold new feature modules under `src/modules/` and register their CQRS handlers, leveraging `ChecksumService` wherever sensitive data needs tamper detection.

## Auth Flow

- `POST /auth/signup`: validate email/firstName/phone/password, create the account, and send a 6-digit email OTP over SMTP.
- `POST /auth/verify-email`: confirm the OTP (timeouts, reuse limits, and checksum-protected digests included).
- `POST /auth/resend-email`: regenerate an OTP (60s cooldown, configurable via env) for unverified users.
- `POST /auth/login`: return a short-lived JWT (default 15-minute expiry) when credentials are valid and the email is verified; otherwise auto-issue an OTP and return instructions to complete verification instead of the token.

All OTPs are hashed with the checksum service, and password storage uses Argon2id. Configure `MAIL_*` env vars so the Nodemailer-backed `MailService` can connect to your SMTP provider.

## Mail Service TODO
- Ensure SMTP credentials are present in your secrets manager and `.env` (see `.env.example`).
- Override the sender per message by setting the optional `from` parameter on `MailService.sendEmailVerification`, or adjust `MAIL_FROM` for the global default.
- Seed the `notification_templates` table with a row whose `code` is `verify_account` and `body` contains your HTML template (see `notification_templates/verify_account.html`).
- Persist and audit outbound email attempts if compliance requires it.
- Add retry/backoff behaviour for transient delivery failures once a provider SDK is used.
