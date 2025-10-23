import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, ResetPasswordDto, RequestPasswordResetDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Send welcome email (async, non-blocking)
    this.emailService.sendWelcomeEmail(email, name).catch(() => {
      // Silently fail - don't block registration
    });

    return {
      message: 'Registration successful! Welcome to our platform.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token exists in database and is not revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { jti: payload.jti },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (storedToken.isRevoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      // Revoke the old refresh token
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(payload.sub);

      return {
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Revoke the refresh token in database
      await this.prisma.refreshToken.updateMany({
        where: {
          jti: payload.jti,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      return {
        message: 'Logout successful',
      };
    } catch (error) {
      // Even if token is invalid, we consider logout successful
      return {
        message: 'Logout successful',
      };
    }
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
    const { email } = requestPasswordResetDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not for security
    if (!user) {
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Store reset token in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        hashedToken,
        expiresAt,
      },
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Find all non-expired, non-used reset tokens
    const resetTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        isUsed: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    // Find the matching token by comparing hashes
    let matchedToken = null;
    for (const storedToken of resetTokens) {
      const isMatch = await bcrypt.compare(token, storedToken.hashedToken);
      if (isMatch) {
        matchedToken = storedToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: matchedToken.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: matchedToken.id },
      data: { isUsed: true },
    });

    // Revoke all refresh tokens for this user (force re-login)
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: matchedToken.userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    return {
      message: 'Password reset successful. Please login with your new password.',
    };
  }

  private async generateTokens(userId: string) {
    const jti = uuidv4();

    // Create access token
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY'),
      },
    );

    // Create refresh token with jti
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY');
    const refreshToken = this.jwtService.sign(
      { sub: userId, jti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiry,
      },
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        jti,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

