import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminLoginCommand } from '../commands/admin-login.command';
import type { AdminLoginResult } from '../contracts/admin-results';
import { AdminLoginResultDto } from '../contracts/admin-swagger.dto';
import { AdminLoginDto } from '../dto/admin-login.dto';

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
      new AdminLoginCommand(payload.email, payload.password, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      }),
    );
  }
}
