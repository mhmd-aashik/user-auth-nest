# NestJS User Authentication System

A comprehensive authentication system built with NestJS, featuring JWT-based authentication, refresh token rotation, password reset, and email notifications.

## Features

### 🔐 Authentication

- **User Registration** - Create new accounts with email validation
- **User Login** - Authenticate with email and password
- **JWT Access Tokens** - Short-lived tokens (15 minutes) for API access
- **Refresh Token Rotation** - Secure token refresh mechanism with automatic rotation
- **Logout** - Token revocation on logout

### 🔑 Password Management

- **Password Reset Request** - Request password reset via email
- **Password Reset** - Secure one-time token-based password reset
- **Password Hashing** - BCrypt encryption for secure password storage

### 📧 Email Features

- Welcome email on registration
- Password reset email with secure token
- Configurable SMTP settings

### 🛡️ Security Features

- Refresh token stored in database with UUID (`jti`)
- Token revocation tracking
- One-time use reset tokens
- Token expiry validation
- Force logout on password reset
- Global authentication guard
- Public route decorator for non-protected endpoints

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: class-validator & class-transformer
- **Email**: Nodemailer
- **Password Hashing**: BCrypt

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- SMTP email service (e.g., Gmail, SendGrid)

## Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd user-auth
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Update the `.env` file with your configuration:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/user_auth?schema=public"

   # JWT Secrets (CHANGE THESE IN PRODUCTION!)
   JWT_ACCESS_SECRET="your-super-secret-access-key"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key"

   # JWT Expiry
   JWT_ACCESS_EXPIRY="15m"
   JWT_REFRESH_EXPIRY="7d"

   # Email Configuration
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="your-app-password"
   EMAIL_FROM="noreply@yourapp.com"

   # Application
   PORT=3000
   NODE_ENV="development"
   APP_URL="http://localhost:3000"
   ```

4. **Set up database**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev --name init

   # (Optional) Open Prisma Studio to view database
   npx prisma studio
   ```

5. **Start the application**

   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run build
   npm run start:prod
   ```

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "strongPassword123",
  "name": "John Doe"  // optional
}
```

**Response:**

```json
{
  "message": "Registration successful! Welcome to our platform.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### 2. Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "strongPassword123"
}
```

**Response:**

```json
{
  "message": "Login successful!",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### 3. Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**

```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### 4. Logout

```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**

```json
{
  "message": "Logout successful"
}
```

#### 5. Request Password Reset

```http
POST /auth/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### 6. Reset Password

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "newStrongPassword123"
}
```

**Response:**

```json
{
  "message": "Password reset successful. Please login with your new password."
}
```

### Protected Endpoints (Authentication Required)

#### Get User Profile

```http
GET /auth/me
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

## Database Schema

### User

- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `password`: String (Hashed)
- `name`: String (Optional)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### RefreshToken

- `id`: UUID (Primary Key)
- `jti`: UUID (Unique identifier for the token)
- `userId`: UUID (Foreign Key)
- `expiresAt`: DateTime
- `isRevoked`: Boolean
- `createdAt`: DateTime

### PasswordResetToken

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key)
- `hashedToken`: String
- `expiresAt`: DateTime
- `isUsed`: Boolean
- `createdAt`: DateTime

## Authentication Flow

### Registration Flow

1. User submits registration form
2. System validates input data
3. Password is hashed using BCrypt
4. User record is created in database
5. Access token (15m) and refresh token (7d) are generated
6. Refresh token stored in database with UUID (`jti`)
7. Welcome email sent asynchronously
8. Tokens returned to client

### Login Flow

1. User submits credentials
2. System validates email and password
3. Access token (15m) and refresh token (7d) are generated
4. Refresh token stored in database with UUID (`jti`)
5. Tokens returned to client

### Refresh Token Flow

1. Client submits refresh token
2. System validates token signature
3. System checks if token exists in database and is not revoked/expired
4. Old refresh token is marked as revoked
5. New access token and refresh token are generated
6. New refresh token stored in database
7. New tokens returned to client

### Logout Flow

1. Client submits refresh token
2. System marks the token as revoked in database
3. Success message returned

### Password Reset Flow

1. User requests password reset with email
2. System generates random UUID token
3. Token is hashed and stored in database with 15-minute expiry
4. Reset email sent with raw token
5. User clicks link and submits new password
6. System validates token by comparing hashes
7. Password is updated
8. Reset token marked as used
9. All refresh tokens for user are revoked (force logout)

## Security Best Practices

1. **Environment Variables**: Never commit `.env` file - use `.env.example` as template
2. **JWT Secrets**: Use strong, random secrets in production
3. **Database Credentials**: Use strong passwords and limit access
4. **HTTPS**: Always use HTTPS in production
5. **Token Storage**: Store refresh tokens securely (HTTP-only cookies recommended)
6. **Rate Limiting**: Implement rate limiting for auth endpoints in production
7. **Email Verification**: Consider adding email verification for registration

## Development Commands

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Testing
npm run test
npm run test:e2e

# Linting
npm run lint

# Format
npm run format

# Database
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate Prisma client
```

## Project Structure

```
src/
├── auth/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   ├── register.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   ├── request-password-reset.dto.ts
│   │   ├── reset-password.dto.ts
│   │   └── index.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── email/
│   ├── email.module.ts
│   └── email.service.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts

prisma/
├── migrations/
└── schema.prisma
```

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an app password: https://myaccount.google.com/apppasswords
3. Use the app password in `EMAIL_PASSWORD` environment variable

### Other SMTP Services

- **SendGrid**: Use API key as password
- **Mailgun**: Configure SMTP credentials
- **AWS SES**: Use SMTP credentials

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -h localhost

# Verify DATABASE_URL in .env
# Make sure database exists
createdb user_auth
```

### Prisma Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate client
npx prisma generate
```

### Email Issues

- Check SMTP credentials
- Verify email service allows less secure apps or use app passwords
- Check firewall/network settings for SMTP port access

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the UNLICENSED License.

## Author

Your Name

## Acknowledgments

- NestJS Documentation
- Prisma Documentation
- JWT Best Practices
