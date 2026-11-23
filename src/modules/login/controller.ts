import { Controller, Get, Post, Req, Res, Version } from '@nestjs/common'
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { IUserRepository } from '@/core/user/repository/user'
import { LoginInput, LoginOutput, LoginSchema } from '@/core/user/use-cases/user-login'
import { RefreshTokenInput, RefreshTokenOutput, RefreshTokenSchema } from '@/core/user/use-cases/user-refresh-token'
import { IHttpAdapter } from '@/infra/http'
import { ISecretsAdapter } from '@/infra/secrets'
import { ITokenAdapter } from '@/libs/token'
import { ApiErrors, openApiSchema } from '@/utils/openapi'
import { ApiRequest } from '@/utils/request'

import { ILoginAdapter, IRefreshTokenAdapter } from './adapter'

const tokensSchema = openApiSchema(z.object({ accessToken: z.string(), refreshToken: z.string() }))
const redirectHeaders = { Location: { schema: { type: 'string' } } }

@ApiTags('Authentication')
@Controller()
export class LoginController {
  constructor(
    private readonly loginUsecase: ILoginAdapter,
    private readonly refreshTokenUsecase: IRefreshTokenAdapter,
    private readonly secret: ISecretsAdapter,
    private readonly http: IHttpAdapter,
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenAdapter
  ) {}

  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({ schema: openApiSchema(LoginSchema) })
  @ApiCreatedResponse({ schema: tokensSchema })
  @ApiErrors(400, 401, 404)
  @Post('login')
  @Version('1')
  async login(@Req() { body, user, tracing }: ApiRequest): Promise<LoginOutput> {
    return this.loginUsecase.execute(body as LoginInput, { user, tracing })
  }

  @ApiOperation({ summary: 'Refresh an access token' })
  @ApiBody({ schema: openApiSchema(RefreshTokenSchema) })
  @ApiCreatedResponse({ schema: tokensSchema })
  @ApiErrors(400, 401, 404)
  @Post('refresh')
  @Version('1')
  async refresh(@Req() { body }: ApiRequest): Promise<RefreshTokenOutput> {
    return this.refreshTokenUsecase.execute(body as RefreshTokenInput)
  }

  @ApiOperation({ summary: 'Start Google sign-in' })
  @ApiResponse({ status: 302, description: 'Redirect to Google', headers: redirectHeaders })
  @Get('login/google')
  @Version('1')
  loginGoogle(@Res() res: Response): void {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.secret.AUTH.GOOGLE.CLIENT_ID}&redirect_uri=${this.secret.AUTH.GOOGLE.REDIRECT_URL}&response_type=code&scope=profile email`
    res.redirect(url)
  }

  @ApiOperation({ summary: 'Complete Google sign-in' })
  @ApiQuery({ name: 'code', type: String, description: 'Google authorization code' })
  @ApiResponse({ status: 302, description: 'Redirect after processing the Google callback', headers: redirectHeaders })
  @Get('login/google/callback')
  @Version('1')
  async loginGoogleCallback(@Res() res: Response, @Req() req: Request): Promise<void> {
    const { code } = req.query
    const http = this.http.instance()
    const { data } = await http.post('https://oauth2.googleapis.com/token', {
      client_id: this.secret.AUTH.GOOGLE.CLIENT_ID,
      client_secret: this.secret.AUTH.GOOGLE.CLIENT_SECRET,
      code,
      redirect_uri: this.secret.AUTH.GOOGLE.REDIRECT_URL,
      grant_type: 'authorization_code'
    })

    const { access_token } = data

    const { data: profile } = await http.get<{ name: string; email: string }>(
      'https://www.googleapis.com/oauth2/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    )

    const user = await this.userRepository.findOneWithRelation({ email: profile.email }, { password: true })

    const tokenNewPassword = this.tokenService.sign({
      email: user.email,
      name: profile.name
    })

    if (!user?.password) {
      res.redirect(`/create-new-password=${tokenNewPassword.token}`)
      return
    }

    const tokenAuthorization = this.tokenService.sign({
      email: user.email,
      name: profile.name,
      roles: user.roles.map((r) => r.name)
    })

    res.redirect(`/home?token=${tokenAuthorization.token}`)
  }
}
