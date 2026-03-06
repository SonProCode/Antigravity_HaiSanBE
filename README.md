# Hai San Quang Ninh - Backend API

Robust NestJS backend for a seafood e-commerce platform.

## Features

- **Auth**: JWT (Access/Refresh Tokens) + Google OAuth 2.0.
- **DB**: PostgreSQL with Prisma ORM.
- **Cache & Queue**: Redis + BullMQ for background jobs.
- **Monitoring**: Prometheus metrics + Healthchecks (Terminus).
- **Security**: RBAC (User/Admin), Passport strategies, Helmet, CORS.
- **Documentation**: Swagger UI at `/docs`.
- **Logging**: Structured winston logs.

## Tech Stack

- NestJS 10+
- Prisma 6
- PostgreSQL 15
- Redis 7
- BullMQ
- Swagger/OpenAPI

## Setup & Development

### 1. Requirements
- Node.js 20+
- Docker Desktop (for Postgres & Redis)

### 2. Installation
```bash
npm install
```

### 3. Infrastructure
Start Postgres and Redis:
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Database Setup
```bash
npx prisma migrate dev
npm run seed
```

### 5. Run
```bash
npm run start:dev
```

## API Documentation
Once running, visit: `http://localhost:3001/docs`

## Admin Credentials (Seeded)
- **Email**: `admin@haisan.vn`
- **Password**: `admin123`

## Directory Structure
- `src/auth`: JWT & Google OAuth logic.
- `src/users`: User management.
- `src/products`: Seafood catalog with slug/filtering.
- `src/carts`: Guest/User cart logic & merging.
- `src/orders`: Transactional ordering & inventory checks.
- `src/jobs`: Background BullMQ processors.
- `src/admin`: Dashboard stats & analytics.
- `src/common`: Global filters, interceptors, and utilities.
