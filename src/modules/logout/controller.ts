import { Controller, HttpCode, Post, Req, Version } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { LogoutInput, LogoutOutput, LogoutSchema } from '@/core/user/use-cases/user-logout'
import { Permission } from '@/utils/decorators'
import { ApiErrors, openApiSchema } from '@/utils/openapi'
import { ApiRequest } from '@/utils/request'

import { ILogoutAdapter } from './adapter'

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller()
export class LogoutController {
  constructor(private readonly logoutUsecase: ILogoutAdapter) {}

  @ApiOperation({ summary: 'Sign out' })
  @ApiBody({ schema: openApiSchema(LogoutSchema) })
  @ApiResponse({ status: 401, description: 'Token was revoked or authentication failed' })
  @ApiErrors(400, 403)
  @Post('/logout')
  @HttpCode(401)
  @Version('1')
  @Permission('user:logout')
  async logout(@Req() { body, user, tracing }: ApiRequest): LogoutOutput {
    return this.logoutUsecase.execute(body as LogoutInput, { user, tracing })
  }
}
