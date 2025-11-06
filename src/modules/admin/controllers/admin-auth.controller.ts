import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminLoginCommand } from '../commands/admin-login.command';
import { AdminRefreshAccessTokenCommand } from '../commands/admin-refresh-access-token.command';
import type { AdminLoginResult } from '../contracts/admin-results';
import { AdminLoginResultDto } from '../contracts/admin-swagger.dto';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminRefreshTokenDto } from '../dto/admin-refresh-token.dto';
import { AdminJwtGuard, AdminAuthenticatedRequest, AuthenticatedAdmin } from '../guards/admin-jwt.guard';
import { AdminChangePasswordDto } from '../dto/admin-change-password.dto';
import { ChangeAdminPasswordCommand } from '../commands/change-admin-password.command';
import { AdminForgotPasswordDto } from '../dto/admin-forgot-password.dto';
import { AdminForgotPasswordCommand } from '../commands/admin-forgot-password.command';
import { AdminResetPasswordDto } from '../dto/admin-reset-password.dto';
import { AdminResetPasswordCommand } from '../commands/admin-reset-password.command';
import type {
  AdminChangePasswordResult,
  AdminForgotPasswordResult,
  AdminResetPasswordResult,
} from '../contracts/admin-results';
import {
  AdminChangePasswordResultDto,
  AdminForgotPasswordResultDto,
  AdminResetPasswordResultDto,
} from '../contracts/admin-swagger.dto';

@ApiTags('admin-auth')
@Controller({ path: 'admin/auth', version: '1' })
export class AdminAuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an admin user' })
  @ApiOkResponse({ description: 'Admin authenticated.', type: AdminLoginResultDto })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(
    @Body() payload: AdminLoginDto,
    @Req() request: Request,
  ): Promise<AdminLoginResult> {
    return this.commandBus.execute(
      new AdminLoginCommand(payload.email, payload.password, Boolean(payload.rememberMe), {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      }),
    );
  }

  @Post('change-password')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the authenticated admin password' })
  @ApiOkResponse({ description: 'Password changed.', type: AdminChangePasswordResultDto })
  async changePassword(
    @Body() payload: AdminChangePasswordDto,
    @Req() request: Request,
  ): Promise<AdminChangePasswordResult> {
    const admin: AuthenticatedAdmin = (request as AdminAuthenticatedRequest).admin;

    if (!admin.adminId) {
      throw new BadRequestException(
        'Super admin password cannot be changed via the API.',
      );
    }

    await this.commandBus.execute(
      new ChangeAdminPasswordCommand(
        admin.adminId,
        payload.currentPassword,
        payload.newPassword,
      ),
    );

    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link for an admin user' })
  @ApiOkResponse({ description: 'Password reset email dispatched if admin exists.', type: AdminForgotPasswordResultDto })
  async forgotPassword(
    @Body() payload: AdminForgotPasswordDto,
  ): Promise<AdminForgotPasswordResult> {
    return this.commandBus.execute(
      new AdminForgotPasswordCommand(payload.email),
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset admin password using a reset token' })
  @ApiOkResponse({ description: 'Password reset completed.', type: AdminResetPasswordResultDto })
  async resetPassword(
    @Body() payload: AdminResetPasswordDto,
  ): Promise<AdminResetPasswordResult> {
    return this.commandBus.execute(
      new AdminResetPasswordCommand(
        payload.email,
        payload.token,
        payload.newPassword,
      ),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange an admin refresh token for a new access token' })
  @ApiOkResponse({ description: 'Access token refreshed.', type: AdminLoginResultDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or expired.' })
  async refresh(
    @Body() payload: AdminRefreshTokenDto,
  ): Promise<AdminLoginResult> {
    return this.commandBus.execute(
      new AdminRefreshAccessTokenCommand(payload.refreshToken),
    );
  }
}
