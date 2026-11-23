import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import type { Express, RequestHandler, Response } from 'express'
import helmet from 'helmet'

import { version } from '../../package.json'

export const apiDocsPath = '/api-docs'

export function mountApiDocumentation(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Microservice API').setVersion(version).addBearerAuth().build()
  )

  const documentPath = `${apiDocsPath}/openapi.json`
  SwaggerModule.setup(apiDocsPath, app, document, { ui: false, raw: ['json'], jsonDocumentUrl: documentPath })

  const scalarCdn = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.69.2'
  const scalarOrigin = new URL(scalarCdn).origin
  const scalarCsp = helmet.contentSecurityPolicy({
    directives: {
      scriptSrc: [
        "'self'",
        scalarOrigin,
        (_request, response) => {
          return `'nonce-${(response as Response).locals.nonce}'`
        }
      ],
      styleSrc: ["'self'", "'unsafe-inline'", scalarOrigin],
      connectSrc: ["'self'", scalarOrigin],
      frameSrc: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      upgradeInsecureRequests: []
    }
  })

  const renderReference: RequestHandler = (request, response, next) => {
    const reference = apiReference({
      url: documentPath,
      cdn: scalarCdn,
      nonce: response.locals.nonce,
      withDefaultFonts: false
    }) as RequestHandler
    reference(request, response, next)
  }
  const express: Express = app.getHttpAdapter().getInstance()
  express.get(apiDocsPath, scalarCsp, renderReference)
}
