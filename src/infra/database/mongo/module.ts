import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { red } from 'colorette'
import { Connection } from 'mongoose'

import { ILoggerAdapter, LoggerModule } from '@/infra/logger'
import { ISecretsAdapter, SecretsModule } from '@/infra/secrets'
import { isMongoEnabled } from '@/infra/secrets/types'
import { ApiInternalServerException } from '@/utils/exception'

import { name } from '../../../../package.json'
import { MongoService } from './service'

const mongoConnection = MongooseModule.forRootAsync({
  imports: [SecretsModule, LoggerModule],
  inject: [ISecretsAdapter, ILoggerAdapter],
  useFactory: ({ MONGO }: ISecretsAdapter, logger: ILoggerAdapter) => {
    if (!MONGO) {
      throw new ApiInternalServerException('MongoDB configuration is required when ENABLE_MONGO is true')
    }

    const connection = new MongoService().getConnection({ URI: MONGO.MONGO_URL })
    return {
      connectionFactory: (connection: Connection) => {
        if (connection.readyState === 1) {
          logger.log('🎯 mongo connected successfully!')
        }
        connection.on('disconnected', () => {
          logger.error(new ApiInternalServerException('mongo disconnected!'))
        })
        connection.on('reconnected', () => {
          logger.log(red('mongo reconnected!\n'))
        })
        connection.on('error', (error) => {
          logger.fatal(new ApiInternalServerException(error.message || error, { context: 'MongoConnection' }))
        })

        return connection
      },
      uri: connection.uri,
      dbName: MONGO.MONGO_DATABASE,
      minPoolSize: 5,
      maxPoolSize: 25,
      maxIdleTimeMS: 300000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      maxConnecting: 5,
      retryWrites: true,
      retryReads: true,
      readPreference: 'primaryPreferred',
      appName: name
    }
  }
})

@Module({
  imports: [ConditionalModule.registerWhen(mongoConnection, ({ ENABLE_MONGO }) => isMongoEnabled(ENABLE_MONGO))]
})
export class MongoDatabaseModule {}
