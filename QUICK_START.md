# 🚀 Quick Start Guide

Get your authentication API running in under 5 minutes!

## Using Docker (Recommended - Fastest!)

```bash
# 1. Start all services
docker-compose up -d

# 2. Check if everything is running
docker-compose ps

# 3. View logs
docker-compose logs -f app

# 4. Test the API
curl http://localhost:3000/health
```

That's it! Your API is running at http://localhost:3000

## Using Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Set up database
npx prisma generate
npx prisma migrate dev --name init

# 4. Start the server
npm run start:dev
```

Your API is running at http://localhost:3000

## Test the API

### Register a new user
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response!

### Get your profile
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## What's Next?

- Read [README.md](./README.md) for complete API documentation
- Check [DOCKER_SETUP.md](./DOCKER_SETUP.md) for Docker commands
- Review [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) for all features
- See [GIT_BRANCHES_SUMMARY.md](./GIT_BRANCHES_SUMMARY.md) for Git workflow

## Need Help?

Common issues:

**Port 3000 already in use?**
```bash
# Docker: Change port in docker-compose.yml
ports:
  - '3001:3000'

# Local: Set PORT in .env
PORT=3001
```

**Database connection error?**
```bash
# Docker: Check if postgres is running
docker-compose ps postgres

# Local: Ensure PostgreSQL is installed and running
```

## Stop the Services

```bash
# Docker
docker-compose down

# Local
# Press Ctrl+C in terminal
```

---

Happy coding! 🎉
