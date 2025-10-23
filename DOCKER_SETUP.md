# Docker Setup Guide

This guide explains how to run the NestJS User Authentication system using Docker.

## Prerequisites

- Docker Desktop (v20.10+)
- Docker Compose (v2.0+)

## Quick Start

### Production Mode

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Check logs**
   ```bash
   docker-compose logs -f app
   ```

3. **Access the application**
   - API: http://localhost:3000
   - Database: localhost:5432

4. **Stop services**
   ```bash
   docker-compose down
   ```

### Development Mode

1. **Start development environment with hot reload**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **View logs**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f app
   ```

3. **Access services**
   - API: http://localhost:3000
   - Database: localhost:5432
   - pgAdmin: http://localhost:5050

4. **Stop development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

## Configuration

### Environment Variables

Create a `.env.docker.local` file (not tracked in git) with your configuration:

```env
# JWT Secrets
JWT_ACCESS_SECRET=your-production-access-secret
JWT_REFRESH_SECRET=your-production-refresh-secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourapp.com

# Application URL
APP_URL=https://your-production-domain.com
```

### Using Environment File

```bash
# Production with custom env file
docker-compose --env-file .env.docker.local up -d

# Development with custom env file
docker-compose -f docker-compose.dev.yml --env-file .env.docker.local up -d
```

## Docker Services

### 1. PostgreSQL Database (`postgres`)
- **Port**: 5432
- **User**: postgres
- **Password**: postgres
- **Database**: user_auth
- **Volume**: `postgres_data` (persists data)

### 2. NestJS Application (`app`)
- **Port**: 3000
- **Environment**: Production/Development
- **Auto-migration**: Runs Prisma migrations on startup

### 3. pgAdmin (Optional - `pgadmin`)
- **Port**: 5050
- **Email**: admin@admin.com
- **Password**: admin
- **Profile**: `tools` (only starts when specified)

To start with pgAdmin:
```bash
docker-compose --profile tools up -d
```

## Docker Commands

### Build and Start

```bash
# Build images
docker-compose build

# Start in detached mode
docker-compose up -d

# Start and rebuild
docker-compose up -d --build

# Start specific service
docker-compose up -d postgres
```

### Logs and Monitoring

```bash
# View all logs
docker-compose logs

# Follow logs (live)
docker-compose logs -f

# View specific service logs
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail=100
```

### Database Operations

```bash
# Run Prisma migrations
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
docker-compose exec app npx prisma generate

# Open Prisma Studio
docker-compose exec app npx prisma studio

# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d user_auth

# Backup database
docker-compose exec postgres pg_dump -U postgres user_auth > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres user_auth < backup.sql
```

### Container Management

```bash
# List running containers
docker-compose ps

# Stop services
docker-compose stop

# Start stopped services
docker-compose start

# Restart services
docker-compose restart

# Remove containers (keeps volumes)
docker-compose down

# Remove containers and volumes (DELETES DATA)
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

### Shell Access

```bash
# Access app container shell
docker-compose exec app sh

# Access postgres container shell
docker-compose exec postgres sh

# Run command in app container
docker-compose exec app npm run lint
```

## Development Workflow

### Hot Reload Development

1. **Start development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Make code changes** - They will automatically reload

3. **View logs**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f app
   ```

### Running Migrations in Development

```bash
# Create new migration
docker-compose -f docker-compose.dev.yml exec app npx prisma migrate dev --name migration_name

# Apply migrations
docker-compose -f docker-compose.dev.yml exec app npx prisma migrate deploy

# Reset database (CAUTION: deletes all data)
docker-compose -f docker-compose.dev.yml exec app npx prisma migrate reset
```

### Running Tests

```bash
# Unit tests
docker-compose -f docker-compose.dev.yml exec app npm test

# E2E tests
docker-compose -f docker-compose.dev.yml exec app npm run test:e2e

# Test coverage
docker-compose -f docker-compose.dev.yml exec app npm run test:cov
```

## Production Deployment

### Building for Production

```bash
# Build production image
docker build -t user-auth-api:latest .

# Tag for registry
docker tag user-auth-api:latest your-registry/user-auth-api:latest

# Push to registry
docker push your-registry/user-auth-api:latest
```

### Production Best Practices

1. **Use secrets management**
   ```bash
   docker secret create jwt_access_secret ./jwt_access.txt
   docker secret create jwt_refresh_secret ./jwt_refresh.txt
   ```

2. **Use Docker Swarm or Kubernetes** for orchestration

3. **Set up health checks**
   - Already configured in Dockerfile
   - Monitor with: `docker inspect --format='{{.State.Health.Status}}' user-auth-app`

4. **Use volume backups**
   ```bash
   docker run --rm -v user-auth_postgres_data:/data -v $(pwd):/backup \
     alpine tar czf /backup/postgres-backup.tar.gz -C /data .
   ```

5. **Monitor logs**
   - Use log aggregation (ELK, Splunk, etc.)
   - Configure log rotation

## Troubleshooting

### Container won't start

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs app

# Inspect container
docker inspect user-auth-app
```

### Database connection issues

```bash
# Check if postgres is healthy
docker-compose ps postgres

# Test database connection
docker-compose exec postgres pg_isready -U postgres

# View postgres logs
docker-compose logs postgres
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or change port in docker-compose.yml
ports:
  - '3001:3000'  # Use different host port
```

### Clean slate restart

```bash
# Stop everything
docker-compose down -v

# Remove all containers, volumes, and networks
docker system prune -a --volumes

# Start fresh
docker-compose up -d --build
```

### Prisma issues

```bash
# Regenerate Prisma client
docker-compose exec app npx prisma generate

# Reset migrations
docker-compose exec app npx prisma migrate reset

# Check migration status
docker-compose exec app npx prisma migrate status
```

### Performance issues

1. **Increase Docker resources** (CPU/Memory in Docker Desktop)
2. **Use volume mounts** for better I/O performance
3. **Enable BuildKit** for faster builds:
   ```bash
   export DOCKER_BUILDKIT=1
   docker-compose build
   ```

## Docker Compose Profiles

```bash
# Start with pgAdmin
docker-compose --profile tools up -d

# Start without pgAdmin (default)
docker-compose up -d
```

## Multi-stage Build Benefits

- **Smaller image size**: Production image only contains what's needed
- **Security**: No development dependencies in production
- **Faster deployments**: Smaller images transfer faster
- **Build cache**: Reuses layers for faster rebuilds

## Network Configuration

The application uses a custom bridge network (`user-auth-network`) for service isolation and communication.

```bash
# Inspect network
docker network inspect user-auth_user-auth-network

# List all networks
docker network ls
```

## Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect user-auth_postgres_data

# Backup volume
docker run --rm -v user-auth_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v user-auth_postgres_data:/data -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/db-backup.tar.gz"
```

## Useful Docker Tips

1. **View resource usage**
   ```bash
   docker stats
   ```

2. **Clean up unused resources**
   ```bash
   docker system df
   docker system prune
   ```

3. **Export/Import containers**
   ```bash
   docker export user-auth-app > app.tar
   docker import app.tar
   ```

4. **Copy files from container**
   ```bash
   docker cp user-auth-app:/app/logs ./logs
   ```

## Next Steps

1. Configure your `.env.docker.local` file
2. Start the services with `docker-compose up -d`
3. Run initial migration with `docker-compose exec app npx prisma migrate deploy`
4. Test the API at http://localhost:3000
5. Access pgAdmin at http://localhost:5050 (if using `--profile tools`)

