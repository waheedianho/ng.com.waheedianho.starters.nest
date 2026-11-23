import { Controller, HttpCode, Post, Put, Req, Version } from '@nestjs/common'
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'

import {
  ResetPasswordConfirmInput,
  ResetPasswordConfirmOutput,
  ResetPasswordConfirmSchema
} from '@/core/reset-password/use-cases/reset-password-confirm'
import {
  ResetPasswordSendEmailInput,
  ResetPasswordSendEmailOutput,
  ResetPasswordSendEmailSchema
} from '@/core/reset-password/use-cases/reset-password-send-email'
import { ApiErrors, openApiSchema } from '@/utils/openapi'
import { ApiRequest } from '@/utils/request'

import { IConfirmResetPasswordAdapter, ISendEmailResetPasswordAdapter } from './adapter'

@ApiTags('Password reset')
@Controller('/reset-password')
export class ResetPasswordController {
  constructor(
    private readonly sendEmailUsecase: ISendEmailResetPasswordAdapter,
    private readonly confirmResetPasswordUsecase: IConfirmResetPasswordAdapter
  ) {}

  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ schema: openApiSchema(ResetPasswordSendEmailSchema) })
  @ApiCreatedResponse({ description: 'Reset request accepted' })
  @ApiErrors(400, 404)
  @Post('send-email')
  @Version('1')
  async sendEmail(@Req() { body }: ApiRequest): Promise<ResetPasswordSendEmailOutput> {
    return await this.sendEmailUsecase.execute(body as ResetPasswordSendEmailInput)
  }

  @ApiOperation({ summary: 'Reset a password' })
  @ApiParam({ name: 'token', type: String, description: 'Password reset token' })
  @ApiBody({ schema: openApiSchema(ResetPasswordConfirmSchema.omit({ token: true })) })
  @ApiOkResponse({ description: 'Password reset' })
  @ApiErrors(400, 401, 404)
  @Put(':token')
  @Version('1')
  @HttpCode(200)
  async confirmResetPassword(@Req() { params, body }: ApiRequest): Promise<ResetPasswordConfirmOutput> {
    return await this.confirmResetPasswordUsecase.execute({
      token: params.token,
      ...body
    } as ResetPasswordConfirmInput)
  }
}
