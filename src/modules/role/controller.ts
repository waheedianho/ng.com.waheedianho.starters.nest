import { Controller, Delete, Get, HttpCode, Post, Put, Req, Version } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { RoleEntitySchema } from '@/core/role/entity/role'
import { RoleAddPermissionInput, RoleAddPermissionOutput } from '@/core/role/use-cases/role-add-permission'
import { RoleCreateInput, RoleCreateOutput, RoleCreateSchema } from '@/core/role/use-cases/role-create'
import { RoleDeleteInput, RoleDeleteOutput } from '@/core/role/use-cases/role-delete'
import { RoleGetByIdInput, RoleGetByIdOutput } from '@/core/role/use-cases/role-get-by-id'
import { RoleListInput, RoleListOutput } from '@/core/role/use-cases/role-list'
import { RoleUpdateInput, RoleUpdateOutput } from '@/core/role/use-cases/role-update'
import { Permission } from '@/utils/decorators'
import { ApiErrors, ApiPaginatedResponse, ApiResourceId, createdResourceSchema, openApiSchema } from '@/utils/openapi'
import { ApiRequest } from '@/utils/request'
import { SearchHttpSchema } from '@/utils/search'
import { SortHttpSchema } from '@/utils/sort'

import {
  IRoleAddPermissionAdapter,
  IRoleCreateAdapter,
  IRoleDeleteAdapter,
  IRoleDeletePermissionAdapter,
  IRoleGetByIdAdapter,
  IRoleListAdapter,
  IRoleUpdateAdapter
} from './adapter'

const roleSchema = openApiSchema(RoleEntitySchema)
const permissionsBody = openApiSchema(z.object({ permissions: z.array(z.string()) }))

@ApiTags('Roles')
@ApiBearerAuth()
@ApiErrors(401, 403)
@Controller('roles')
export class RoleController {
  constructor(
    private readonly createUsecase: IRoleCreateAdapter,
    private readonly updateUsecase: IRoleUpdateAdapter,
    private readonly getByIdUsecase: IRoleGetByIdAdapter,
    private readonly listUsecase: IRoleListAdapter,
    private readonly deleteUsecase: IRoleDeleteAdapter,
    private readonly addPermissionUsecase: IRoleAddPermissionAdapter,
    private readonly deletePermissionUsecase: IRoleDeletePermissionAdapter
  ) {}

  @ApiOperation({ summary: 'Create a role' })
  @ApiBody({ schema: openApiSchema(RoleCreateSchema) })
  @ApiCreatedResponse({ schema: createdResourceSchema })
  @ApiErrors(400, 409)
  @Post()
  @Version('1')
  @Permission('role:create')
  @HttpCode(201)
  async create(@Req() { body }: ApiRequest): Promise<RoleCreateOutput> {
    return await this.createUsecase.execute(body as RoleCreateInput)
  }

  @ApiOperation({ summary: 'Update a role' })
  @ApiResourceId()
  @ApiBody({ schema: openApiSchema(RoleEntitySchema.pick({ name: true }).partial()) })
  @ApiOkResponse({ schema: roleSchema })
  @ApiErrors(400, 404)
  @Put(':id')
  @Version('1')
  @Permission('role:update')
  async update(@Req() { body, params }: ApiRequest): Promise<RoleUpdateOutput> {
    return await this.updateUsecase.execute({ ...body, id: params.id } as RoleUpdateInput)
  }

  @ApiOperation({ summary: 'Get a role' })
  @ApiResourceId()
  @ApiOkResponse({ schema: roleSchema })
  @ApiErrors(400, 404)
  @Get(':id')
  @Version('1')
  @Permission('role:getbyid')
  async getById(@Req() { params }: ApiRequest): Promise<RoleGetByIdOutput> {
    return await this.getByIdUsecase.execute(params as RoleGetByIdInput)
  }

  @ApiOperation({ summary: 'List roles' })
  @ApiPaginatedResponse(RoleEntitySchema)
  @Get()
  @Version('1')
  @Permission('role:list')
  async list(@Req() { query }: ApiRequest): Promise<RoleListOutput> {
    const input: RoleListInput = {
      sort: SortHttpSchema.parse(query.sort),
      search: SearchHttpSchema.parse(query.search),
      limit: Number(query.limit),
      page: Number(query.page)
    }

    return await this.listUsecase.execute(input)
  }

  @ApiOperation({ summary: 'Delete a role' })
  @ApiResourceId()
  @ApiOkResponse({ schema: roleSchema })
  @ApiErrors(400, 404, 409)
  @Delete(':id')
  @Version('1')
  @Permission('role:delete')
  async delete(@Req() { params }: ApiRequest): Promise<RoleDeleteOutput> {
    return await this.deleteUsecase.execute(params as RoleDeleteInput)
  }

  @ApiOperation({ summary: 'Add permissions to a role' })
  @ApiResourceId()
  @ApiBody({ schema: permissionsBody })
  @ApiOkResponse({ description: 'Permissions added' })
  @ApiErrors(400, 404)
  @Put('/add-permissions/:id')
  @Version('1')
  @Permission('role:addpermission')
  async addPermissions(@Req() { body, params }: ApiRequest): Promise<RoleAddPermissionOutput> {
    return await this.addPermissionUsecase.execute({ ...body, id: params.id } as RoleAddPermissionInput)
  }

  @ApiOperation({ summary: 'Remove permissions from a role' })
  @ApiResourceId()
  @ApiBody({ schema: permissionsBody })
  @ApiOkResponse({ description: 'Permissions removed' })
  @ApiErrors(400, 404)
  @Put('/remove-permissions/:id')
  @HttpCode(200)
  @Version('1')
  @Permission('role:deletepermission')
  async removePermissions(@Req() { body, params }: ApiRequest): Promise<RoleAddPermissionOutput> {
    return await this.deletePermissionUsecase.execute({ ...body, id: params.id } as RoleAddPermissionInput)
  }
}
