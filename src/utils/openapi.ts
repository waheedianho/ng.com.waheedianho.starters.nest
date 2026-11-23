import { STATUS_CODES } from 'node:http'

import { applyDecorators } from '@nestjs/common'
import type { SchemaObject } from '@nestjs/swagger'
import { ApiOkResponse, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { z } from 'zod'

export function openApiSchema(schema: z.ZodType): SchemaObject {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema instanceof z.ZodDate) {
        Object.assign(jsonSchema, { type: 'string', format: 'date-time' })
      }
    }
  }) as SchemaObject
}

export const createdResourceSchema = openApiSchema(z.object({ id: z.uuid(), created: z.boolean() }))

export function ApiResourceId() {
  return ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
}

export function ApiPaginatedResponse(item: z.ZodType) {
  return applyDecorators(
    ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, default: 1 } }),
    ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }),
    ApiQuery({ name: 'sort', required: false, type: String, example: 'createdAt:desc' }),
    ApiQuery({ name: 'search', required: false, type: String, example: 'name:example' }),
    ApiOkResponse({
      description: 'Paginated results',
      schema: openApiSchema(
        z.object({
          docs: z.array(item),
          page: z.int(),
          limit: z.int(),
          total: z.int(),
          totalPages: z.int().optional()
        })
      )
    })
  )
}

const errorSchema = openApiSchema(
  z.object({
    error: z.object({
      code: z.int(),
      message: z.array(z.string()),
      name: z.string(),
      timestamp: z.string(),
      path: z.string(),
      traceid: z.string().optional(),
      context: z.string().optional(),
      details: z.unknown().optional()
    })
  })
)

export function ApiErrors(...statuses: number[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        // eslint-disable-next-line security/detect-object-injection
        description: STATUS_CODES[status],
        schema: errorSchema
      })
    )
  )
}
