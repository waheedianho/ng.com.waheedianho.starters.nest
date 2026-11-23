import './utils/tracing'

import { RequestMethod, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import bodyParser from 'body-parser'
import { bold } from 'colorette'
import compression from 'compression'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { IncomingMessage, ServerResponse } from 'http'

import { ILoggerAdapter } from '@/infra/logger/adapter'
import { ISecretsAdapter } from '@/infra/secrets'
import { ExceptionHandlerFilter } from '@/middlewares/filters'

import { name } from '../package.json'
import { AppModule } from './app.module'
import { ErrorType } from './infra/logger'
import { apiDocsPath, mountApiDocumentation } from './utils/api-docs'
import { CryptoUtils } from './utils/crypto'
import { changeLanguage, initI18n, normalizeLocale } from './utils/validator'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: true
  })

  const loggerService = app.get(ILoggerAdapter)

  loggerService.setApplication(name)
  app.useLogger(loggerService)

  app.useGlobalFilters(new ExceptionHandlerFilter(loggerService))

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health/*', method: RequestMethod.GET },
      { path: 'alert', method: RequestMethod.POST },
      { path: '/', method: RequestMethod.GET }
    ]
  })

  await initI18n('en-US')

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const languegeQuery = req.query.lang as string
    const acceptLanguage = req.headers['accept-language']

    const rawLocale = [languegeQuery, (acceptLanguage || '').split(',')[0].split(';')[0], 'en-US'].find(
      Boolean
    ) as string

    const locale = normalizeLocale(rawLocale)

    try {
      await changeLanguage(locale as 'en-US' | 'pt-BR' | 'es-ES')
    } catch (error) {
      loggerService.warn({ message: `Failed to change language to ${locale}`, obj: { originalError: error } })
    }

    if (req.originalUrl && req.originalUrl.split('/').pop() === 'favicon.ico') {
      return res.sendStatus(204)
    }

    const nonce = CryptoUtils.generateRandomBase64()
    res.locals.nonce = nonce
    res.setHeader('X-Content-Security-Policy-Nonce', nonce)
    next()
  })

  app.use(
    helmet({
      xssFilter: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
          imgSrc: [`'self'`, 'data:', 'blob:', 'validator.swagger.io'],
          scriptSrc: [
            "'self'",
            (req, res) => {
              return `'nonce-${(res as ServerResponse<IncomingMessage> & { locals: { nonce: string } }).locals.nonce}'`
            }
          ]
        }
      }
    })
  )

  app.use(compression())

  const {
    ENV,
    TIMEOUT,
    MONGO,
    POSTGRES: { POSTGRES_URL, POSTGRES_PGADMIN_URL },
    PORT,
    HOST,
    ZIPKIN_URL,
    PROMETHUES_URL,
    GRAFANA_URL,
    IS_PRODUCTION
  } = app.get(ISecretsAdapter)

  setTimeout()

  app.use(bodyParser.urlencoded({ extended: true }))

  app.enableVersioning({ type: VersioningType.URI })

  process.on('uncaughtException', (error) => {
    loggerService.error(error as ErrorType)
  })

  process.on('unhandledRejection', (error) => {
    loggerService.error(error as ErrorType)
  })

  if (!IS_PRODUCTION) {
    mountApiDocumentation(app)
  }

  loggerService.log(`🔵 Postgres listening at ${bold(POSTGRES_URL)}`)
  loggerService.log(
    `🔶 PgAdmin listening at ${bold(POSTGRES_PGADMIN_URL)} user: ${bold('pgadmin@gmail.com')} password: ${bold('PgAdmin2019!')}`
  )
  if (MONGO?.MONGO_EXPRESS_URL) {
    loggerService.log(`🔶 Mongo Express at ${bold(MONGO.MONGO_EXPRESS_URL)}`)
  }
  loggerService.log(`⚪ Grafana[${bold('Graphs')}] listening at ${bold(GRAFANA_URL)}`)
  loggerService.log(`⚪ Zipkin[${bold('Tracing')}] listening at ${bold(ZIPKIN_URL)}`)
  loggerService.log(`⚪ Promethues[${bold('Metrics')}] listening at ${bold(PROMETHUES_URL)}\n`)

  await app.listen(PORT, () => {
    loggerService.log(`🟢 ${name} listening at ${bold(PORT)} on ${bold(ENV?.toUpperCase())} 🟢`)
    if (!IS_PRODUCTION) loggerService.log(`🟢 Scalar documentation at ${bold(`${HOST}${apiDocsPath}`)} 🟢`)
  })

  function setTimeout() {
    const httpServer = app.getHttpServer()
    httpServer.timeout = TIMEOUT + 1000
    httpServer.keepAliveTimeout = 60000
    httpServer.headersTimeout = 61000
  }
}

bootstrap()
