# BanterCore

A production-style full-stack prototype for a social discussion platform, built to demonstrate Go API design, authentication, PostgreSQL persistence, Redis caching, real-time workflows, and testable service boundaries.

## Demonstrates

- Go HTTP API with health checks and discussion endpoints
- JWT authentication and bcrypt password hashing
- PostgreSQL schema for users, discussions, comments, and likes
- Redis service in the local Docker environment
- Event publisher boundary ready for a broker adapter
- Graceful shutdown, request IDs, structured JSON errors, and unit tests
- Docker-ready local development shape

This is a personal project, not production experience. It is intentionally scoped to show how I would approach Muze's backend problems.

## Run locally

```bash
docker compose up --build
```

The API listens on `http://localhost:8080`. The database schema is in `migrations/001_init.sql`.

## Frontend

The `web/` folder contains a responsive discussion-feed UI with a composer and API integration.
