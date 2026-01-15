# Docker Setup Guide

This guide explains how to set up and run FlowBot Studio using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 4GB of RAM available for Docker
- Ports 3000, 3001, 5432, and 6379 available

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd FlowBot-Studio
```

### 2. Environment Variables

Copy the example environment files:

```bash
# Root
cp .env.example .env

# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env
```

**Note:** The default `.env` files are already configured for Docker setup. If you want to customize, edit the files before starting Docker.

### 3. Start All Services

```bash
docker-compose up -d
```

This will start:

- PostgreSQL (port 5432)
- Redis (port 6379)
- API service (port 3001)
- Web service (port 3000)

### 4. Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

### 5. Access the Application

- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

## Demo Credentials

After seeding (automatic on first start), you can login with:

### Tenant 1: Acme Corporation

- **Admin**: `admin@acme.com` / `password123`
- **Builder**: `builder@acme.com` / `password123`
- **Agent**: `agent@acme.com` / `password123`

### Tenant 2: Demo Company

- **Admin**: `admin@demo.com` / `password123`

## Development Workflow

### Running in Development Mode

The Docker setup uses volume mounts for hot-reloading:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

### Database Management

```bash
# Run migrations manually
docker-compose exec api pnpm prisma:migrate dev

# Generate Prisma client
docker-compose exec api pnpm prisma:generate

# Seed database
docker-compose exec api pnpm prisma:seed

# Access Prisma Studio
docker-compose exec api pnpm prisma:studio
# Then open http://localhost:5555 in your browser
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U flowbot -d flowbot_db

# Connect to Redis
docker-compose exec redis redis-cli
```

## Production Build

For production deployment:

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Port Already in Use

If ports are already in use, edit `docker-compose.yml` to change port mappings:

```yaml
ports:
  - '3002:3001' # Change external port
```

### Database Connection Issues

1. Check if PostgreSQL is running:

   ```bash
   docker-compose ps postgres
   ```

2. Check PostgreSQL logs:

   ```bash
   docker-compose logs postgres
   ```

3. Verify DATABASE_URL in `apps/api/.env`

### Reset Everything

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

### View Container Status

```bash
docker-compose ps
```

### Access Container Shell

```bash
# API container
docker-compose exec api sh

# PostgreSQL container
docker-compose exec postgres sh

# Redis container
docker-compose exec redis sh
```

## Services Overview

| Service  | Port | Description             |
| -------- | ---- | ----------------------- |
| postgres | 5432 | PostgreSQL database     |
| redis    | 6379 | Redis cache/queue       |
| api      | 3001 | NestJS API server       |
| web      | 3000 | Next.js web application |

## Environment Variables

### API Service

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT secret (min 32 characters)
- `JWT_REFRESH_SECRET`: JWT refresh secret (min 32 characters)
- `ENCRYPTION_KEY`: Encryption key (exactly 32 characters)
- `PORT`: API server port (default: 3001)
- `CORS_ORIGIN`: Allowed CORS origins
- `WEB_URL`: Web application URL

### Web Service

- `NEXT_PUBLIC_API_URL`: API base URL
- `PORT`: Web server port (default: 3000)

## Seed Data

The seed script automatically runs on first start and creates:

- 2 demo tenants (Acme Corporation, Demo Company)
- 4 demo users with different roles
- 2 demo bots with flow graphs
- 1 knowledge base collection with FAQ
- 1 tool (Weather API example)
- 1 channel connection (Web channel)
- 1 published bot version

To reseed:

```bash
docker-compose exec api pnpm prisma:seed
```

## Network

All services run on the `flowbot-network` bridge network, allowing them to communicate using service names (e.g., `postgres`, `redis`, `api`, `web`).
