/**
 * @see https://github.com/mikemajesty/nestjs-microservice-boilerplate-api/blob/master/guides/modules/test.md
 */
import { ZodMockSchema } from '@mikemajesty/zod-mock-schema'
import { DynamicModule, INestApplication } from '@nestjs/common'
import { getConnectionToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { CatEntity, CatEntitySchema } from '@/core/cat/entity/cat'
import { ICatRepository } from '@/core/cat/repository/cat'
import { ICacheAdapter } from '@/infra/cache'
import { RedisService } from '@/infra/cache/redis'
import { ConnectionName } from '@/infra/database/enum'
import { TestMongoContainer, TestRedisContainer } from '@/utils/test/containers'

describe('CatController', () => {
  let app: INestApplication
  let repository: ICatRepository

  const containerMongo = new TestMongoContainer()
  const containerRedis = new TestRedisContainer()

  beforeAll(async () => {
    jest.replaceProperty(process, 'env', { ...process.env, ENABLE_MONGO: 'true' })
    const { CatModule } = await import('../module')
    const { mongoConnection } = await containerMongo.getTestMongo(ConnectionName.CATS)
    const connectionToken = getConnectionToken()
    const repositoryToken = Symbol('CatRepository from CatModule')
    const mongoConnectionModule: DynamicModule = {
      module: class TestMongoConnectionModule {},
      global: true,
      providers: [{ provide: connectionToken, useValue: mongoConnection }],
      exports: [connectionToken]
    }

    const moduleRef = await Test.createTestingModule({
      imports: [mongoConnectionModule, CatModule],
      providers: [{ provide: repositoryToken, useExisting: ICatRepository }]
    })
      .overrideProvider(ICacheAdapter)
      .useFactory({
        async factory(): Promise<RedisService> {
          const redis = await containerRedis.getTestRedis()
          return redis
        },
        inject: []
      })
      .compile()

    app = moduleRef.createNestApplication()
    repository = app.get(repositoryToken)
    await app.init()
  })

  it(`/GET /v1/cats`, async () => {
    const catMock = new ZodMockSchema(CatEntitySchema)
    const input = catMock.generate()
    await repository.create(new CatEntity(input))

    return request(app.getHttpServer())
      .get('/cats')
      .set('Authorization', `Bearer ${process.env.TOKEN_TEST}`)
      .expect(200)
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    await containerMongo.close()
    await containerRedis.close()
    await app.close()
  })
})
