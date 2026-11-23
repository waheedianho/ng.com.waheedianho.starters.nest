import { Controller, Delete, Get, HttpCode, Post, Put, Req, Version } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { UserEntitySchema } from '@/core/user/entity/user'
import {
  UserChangePasswordFieldsSchema,
  UserChangePasswordInput,
  UserChangePasswordOutput
} from '@/core/user/use-cases/user-change-password'
import { UserCreateInput, UserCreateOutput, UserCreateSchema } from '@/core/user/use-cases/user-create'
import { UserDeleteInput, UserDeleteOutput } from '@/core/user/use-cases/user-delete'
import { UserGetByIdInput, UserGetByIdOutput } from '@/core/user/use-cases/user-get-by-id'
import { UserListInput, UserListOutput } from '@/core/user/use-cases/user-list'
import { UserUpdateFieldsSchema, UserUpdateInput, UserUpdateOutput } from '@/core/user/use-cases/user-update'
import { Permission } from '@/utils/decorators'
import { ApiErrors, ApiPaginatedResponse, ApiResourceId, createdResourceSchema, openApiSchema } from '@/utils/openapi'
import { ApiRequest, UserRequest } from '@/utils/request'
import { SearchHttpSchema } from '@/utils/search'
import { SortHttpSchema } from '@/utils/sort'

import {
  IUserChangePasswordAdapter,
  IUserCreateAdapter,
  IUserDeleteAdapter,
  IUserGetByIdAdapter,
  IUserListAdapter,
  IUserUpdateAdapter
} from './adapter'

const publicUser = UserEntitySchema.omit({ password: true })
const userSchema = openApiSchema(publicUser)

@ApiTags('Users')
@ApiBearerAuth()
@ApiErrors(401)
@Controller('users')
export class UserController {
  constructor(
    private readonly createUsecase: IUserCreateAdapter,
    private readonly updateUsecase: IUserUpdateAdapter,
    private readonly deleteUsecase: IUserDeleteAdapter,
    private readonly listUsecase: IUserListAdapter,
    private readonly getByIdUsecase: IUserGetByIdAdapter,
    private readonly changePassUsecase: IUserChangePasswordAdapter
  ) {}

  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({ schema: openApiSchema(UserCreateSchema) })
  @ApiCreatedResponse({ schema: createdResourceSchema })
  @ApiErrors(400, 403, 404, 409)
  @Post()
  @Version('1')
  @Permission('user:create')
  @HttpCode(201)
  async create(@Req() { body, user, tracing }: ApiRequest): Promise<UserCreateOutput> {
    return this.createUsecase.execute(body as UserCreateInput, { user, tracing })
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiResourceId()
  @ApiBody({ schema: openApiSchema(UserUpdateFieldsSchema) })
  @ApiOkResponse({ schema: userSchema })
  @ApiErrors(400, 403, 404, 409)
  @Put(':id')
  @Version('1')
  @Permission('user:update')
  async update(@Req() { body, user, tracing, params }: ApiRequest): Promise<UserUpdateOutput> {
    return this.updateUsecase.execute({ ...body, id: params.id } as UserUpdateInput, { user, tracing })
  }

  @ApiOperation({ summary: 'List users' })
  @ApiPaginatedResponse(publicUser)
  @ApiErrors(403)
  @Get()
  @Version('1')
  @Permission('user:list')
  async list(@Req() { query }: ApiRequest): Promise<UserListOutput> {
    const input: UserListInput = {
      sort: SortHttpSchema.parse(query.sort),
      search: SearchHttpSchema.parse(query.search),
      limit: Number(query.limit),
      page: Number(query.page)
    }

    return await this.listUsecase.execute(input)
  }

  @ApiOperation({ summary: 'Get the signed-in user' })
  @ApiOkResponse({ schema: openApiSchema(publicUser.pick({ id: true, email: true, name: true })) })
  @Get('/me')
  @Version('1')
  me(@Req() { user }: ApiRequest): UserRequest {
    return user
  }

  @ApiOperation({ summary: 'Get a user' })
  @ApiResourceId()
  @ApiOkResponse({ schema: userSchema })
  @ApiErrors(400, 403, 404)
  @Get(':id')
  @Version('1')
  @Permission('user:getbyid')
  async getById(@Req() { params }: ApiRequest): Promise<UserGetByIdOutput> {
    return await this.getByIdUsecase.execute(params as UserGetByIdInput)
  }

  @ApiOperation({ summary: 'Change a user password' })
  @ApiResourceId()
  @ApiBody({ schema: openApiSchema(UserChangePasswordFieldsSchema) })
  @ApiOkResponse({ description: 'Password changed' })
  @ApiErrors(400, 403, 404, 409)
  @Put('change-password/:id')
  @Version('1')
  @Permission('user:changepassword')
  async changePassword(@Req() { params, body }: ApiRequest): Promise<UserChangePasswordOutput> {
    return await this.changePassUsecase.execute({ id: params.id, ...body } as UserChangePasswordInput)
  }

  @ApiOperation({ summary: 'Delete a user' })
  @ApiResourceId()
  @ApiOkResponse({ schema: userSchema })
  @ApiErrors(400, 403, 404)
  @Delete(':id')
  @Version('1')
  @Permission('user:delete')
  async delete(@Req() { params, user, tracing }: ApiRequest): Promise<UserDeleteOutput> {
    return await this.deleteUsecase.execute(params as UserDeleteInput, { user, tracing })
  }
}
