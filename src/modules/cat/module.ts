import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'

import { ICatRepository } from '@/core/cat/repository/cat'
import { CatCreateUsecase } from '@/core/cat/use-cases/cat-create'
import { CatDeleteUsecase } from '@/core/cat/use-cases/cat-delete'
import { CatGetByIdUsecase } from '@/core/cat/use-cases/cat-get-by-id'
import { CatListUsecase } from '@/core/cat/use-cases/cat-list'
import { CatUpdateUsecase } from '@/core/cat/use-cases/cat-update'
import { RedisCacheModule } from '@/infra/cache/redis'
import { Cat, CatSchema } from '@/infra/database/mongo/schemas/cat'
import { ILoggerAdapter, LoggerModule } from '@/infra/logger'
import { isMongoEnabled } from '@/infra/secrets/types'
import { TokenLibModule } from '@/libs/token'
import { AuthenticationMiddleware } from '@/middlewares/middlewares'

import { ICatCreateAdapter, ICatDeleteAdapter, ICatGetByIdAdapter, ICatListAdapter, ICatUpdateAdapter } from './adapter'
import { CatController } from './controller'
import { CatRepository } from './repository'

@Module({
  imports: [
    TokenLibModule,
    LoggerModule,
    RedisCacheModule,
    MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }])
  ],
  controllers: [CatController],
  providers: [
    { provide: ICatRepository, useClass: CatRepository },
    {
      provide: ICatCreateAdapter,
      useFactory: (repository: ICatRepository) => new CatCreateUsecase(repository),
      inject: [ICatRepository]
    },
    {
      provide: ICatUpdateAdapter,
      useFactory: (logger: ILoggerAdapter, repository: ICatRepository) => new CatUpdateUsecase(repository, logger),
      inject: [ILoggerAdapter, ICatRepository]
    },
    {
      provide: ICatGetByIdAdapter,
      useFactory: (repository: ICatRepository) => new CatGetByIdUsecase(repository),
      inject: [ICatRepository]
    },
    {
      provide: ICatListAdapter,
      useFactory: (repository: ICatRepository) => new CatListUsecase(repository),
      inject: [ICatRepository]
    },
    {
      provide: ICatDeleteAdapter,
      useFactory: (repository: ICatRepository) => new CatDeleteUsecase(repository),
      inject: [ICatRepository]
    }
  ],
  exports: [
    ICatRepository,
    ICatCreateAdapter,
    ICatUpdateAdapter,
    ICatGetByIdAdapter,
    ICatListAdapter,
    ICatDeleteAdapter
  ]
})
class CatFeatureModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthenticationMiddleware).forRoutes(CatController)
  }
}

@Module({
  imports: [ConditionalModule.registerWhen(CatFeatureModule, ({ ENABLE_MONGO }) => isMongoEnabled(ENABLE_MONGO))],
  exports: [ConditionalModule]
})
export class CatModule {}
