/**
 * @see https://github.com/mikemajesty/nestjs-microservice-boilerplate-api/blob/master/guides/modules/controller.md
 */
import { Body, Controller, Post } from '@nestjs/common'
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { ILoggerAdapter } from '@/infra/logger'

@ApiTags('Alerts')
@Controller('alert')
export class AlertController {
  constructor(private readonly logger: ILoggerAdapter) {}

  @ApiOperation({ summary: 'Receive an alert webhook' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiCreatedResponse({
    schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } }, required: ['status'] }
  })
  @Post()
  handleAlert(@Body() body: unknown) {
    this.logger.warn({ message: '🔔 Alerta received:\n' + JSON.stringify(body, null, 2) })
    return { status: 'ok' }
  }
}
