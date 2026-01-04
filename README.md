# FlowBot Studio

Multi-tenant no-code chatbot builder + runtime platform.

## Tech Stack

- **Frontend**: Next.js 14 (TypeScript)
- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Package Manager**: pnpm workspaces
- **Containerization**: Docker Compose

## Project Structure

```
.
├── apps/
│   ├── web/          # Next.js Studio/Admin/Agent Desk
│   └── api/          # NestJS API + Runtime Orchestrator
├── packages/
│   └── shared/       # Shared types, zod schemas, utils
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose (for PostgreSQL and Redis)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example env files and fill in the values:

```bash
# Root
cp .env.example .env

# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env
```

**Required Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT secret (min 32 characters)
- `JWT_REFRESH_SECRET`: JWT refresh secret (min 32 characters)
- `ENCRYPTION_KEY`: Encryption key (exactly 32 characters)
- `LINE_CHANNEL_SECRET`: (optional) LINE channel secret
- `LINE_CHANNEL_ACCESS_TOKEN`: (optional) LINE channel access token

### 3. Start Docker Services

Start PostgreSQL and Redis:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

### 4. Set Up Database

Generate Prisma client and run migrations:

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed  # Optional: seed sample data
```

### 5. Start Development Servers

From the root directory, run:

```bash
pnpm dev
```

This will start:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001

## Available Scripts

### Root

- `pnpm dev` - Start web and api in development mode (concurrently)
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type check all packages
- `pnpm test` - Run tests in all packages
- `pnpm clean` - Clean build artifacts

### API (`apps/api`)

- `pnpm start:dev` - Start NestJS in watch mode
- `pnpm build` - Build NestJS app
- `pnpm test` - Run tests
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:seed` - Seed database
- `pnpm prisma:studio` - Open Prisma Studio

### Web (`apps/web`)

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build Next.js app
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Shared (`packages/shared`)

- `pnpm build` - Build shared package
- `pnpm test` - Run tests

## Development Workflow

1. **Create a feature branch**
2. **Make changes** in the relevant app/package
3. **Run type checking**: `pnpm type-check`
4. **Run linting**: `pnpm lint`
5. **Format code**: `pnpm format`
6. **Run tests**: `pnpm test`
7. **Commit** (pre-commit hooks will run lint-staged)

## Database Management

### Prisma Studio

View and edit database data:

```bash
cd apps/api
pnpm prisma:studio
```

### Create a Migration

```bash
cd apps/api
pnpm prisma:migrate dev --name migration_name
```

### Reset Database

```bash
cd apps/api
pnpm prisma:migrate reset
```

## Code Quality

- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Run linters on staged files
- **Vitest**: Unit testing (shared package)
- **Jest**: Unit testing (API)

## Architecture Principles

1. **Multi-tenant**: All queries enforce tenant isolation
2. **Audit logging**: Every write endpoint records audit logs
3. **Deterministic runtime**: Runtime execution is deterministic and idempotent
4. **Type safety**: Shared DTOs in `packages/shared` with Zod validation
5. **Test coverage**: Unit tests for core modules, integration tests for publish/runtime

## Troubleshooting

### Port Already in Use

If ports 3000 or 3001 are already in use, update the port in:
- `apps/web/.env` (NEXT_PUBLIC_API_URL, PORT)
- `apps/api/.env` (PORT)

### Database Connection Issues

1. Verify Docker containers are running: `docker-compose ps`
2. Check DATABASE_URL in `apps/api/.env`
3. Verify PostgreSQL is accessible: `docker-compose logs postgres`

### Prisma Client Not Found

Run `pnpm prisma:generate` in `apps/api`

### Module Resolution Issues

1. Rebuild shared package: `cd packages/shared && pnpm build`
2. Reinstall dependencies: `pnpm install`

## Next Steps

See the roadmap in the project documentation for upcoming features:
- Step 1: Data Model + Prisma Schema
- Step 2: Auth + RBAC + Audit Log
- Step 3: Bot & Versioning API
- Step 4: Runtime Orchestrator
- Step 5: Studio Web App
- And more...

## License

Private - All Rights Reserved

