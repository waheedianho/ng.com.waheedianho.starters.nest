import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import os from 'os'
import { z } from 'zod'

import { openApiSchema } from '@/utils/openapi'

import { version } from '../../../package.json'
import { IHealthAdapter } from './adapter'
import { HealthOutput, healthReadinessSchema, HealthStatus } from './types'

@ApiTags('Health')
@Controller(`health`)
export class HealthController {
  constructor(private readonly service: IHealthAdapter) {}

  @ApiOperation({ summary: 'Check readiness and dependency health' })
  @ApiOkResponse({ schema: openApiSchema(healthReadinessSchema) })
  @Get(['ready'])
  async getReadiness(): Promise<HealthOutput> {
    const memory = this.service.getMemoryUsageInMB()

    const numCpus = os.cpus().length
    const [lastMinute, lastFiveMinutes, lastFifteenMinutes] = os.loadavg()

    const mongoHealth = this.service.mongo
      ? Promise.all([
          this.service.getMongoStatus(),
          this.service.getMongoConnections(),
          this.service.getMongoMemory()
        ]).then(([status, connection, memory]) => ({ status, connection, memory }))
      : { status: HealthStatus.DISABLED as const }

    const [mongo, postgresState, redisState, cpuList, postgresMemory, postgresConnections, latency, connections] =
      await Promise.all([
        mongoHealth,
        this.service.getPostgresStatus(),
        this.service.getRedisStatus(),
        this.service.getCPUCore(),
        this.service.getPostgresMemory(),
        this.service.getPostgresConnections(),
        this.service.getLatency(),
        this.service.getActiveConnections()
      ])

    const cpuStatus = []
    for (const [index, core] of cpuList.cpus.entries()) {
      cpuStatus.push({ core: index + 1, load: `${core.load.toFixed(2)}%` })
    }

    const cpu = {
      cpus: numCpus,
      globalAvarage: {
        lastMinute: this.service.getLoadAvarage(lastMinute, numCpus),
        lastFiveMinutes: this.service.getLoadAvarage(lastFiveMinutes, numCpus),
        lastFifteenMinutes: this.service.getLoadAvarage(lastFifteenMinutes, numCpus)
      },
      cores: cpuStatus
    }

    const output = {
      server: HealthStatus.UP,
      version,
      mongo,
      postgres: {
        status: postgresState,
        connection: postgresConnections,
        memory: postgresMemory
      },
      redisState,
      network: {
        latency: String(latency),
        connections: Number(connections)
      },
      memory,
      cpu
    }

    return output
  }

  @ApiOperation({ summary: 'Check whether the process is alive' })
  @ApiOkResponse({
    schema: openApiSchema(
      z.object({
        status: z.literal(HealthStatus.UP),
        timestamp: z.iso.datetime(),
        uptime: z.number()
      })
    )
  })
  @Get(['live', '/health', '/'])
  async getLiveness() {
    return {
      status: HealthStatus.UP,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  }

  @ApiOperation({ summary: 'Check whether application dependencies have initialized' })
  @ApiOkResponse({
    schema: openApiSchema(
      z.object({
        status: z.enum(HealthStatus),
        timestamp: z.iso.datetime(),
        phase: z.literal('startup'),
        message: z.string(),
        connections: z.object({ mongo: z.string(), postgres: z.string(), redis: z.string() }).optional(),
        error: z.string().optional()
      })
    )
  })
  @Get('startup')
  async getStartup() {
    try {
      const mongo = this.service.mongo
      const isMongoConnected = mongo?.readyState === 1

      const isPostgresInitialized = this.service.postgres.isInitialized

      const isRedisClientReady = !!this.service.redis

      const basicSystemsConnected = (!mongo || isMongoConnected) && isPostgresInitialized && isRedisClientReady

      return {
        status: basicSystemsConnected ? HealthStatus.UP : HealthStatus.DOWN,
        timestamp: new Date().toISOString(),
        phase: 'startup',
        connections: {
          mongo: mongo ? (isMongoConnected ? 'connected' : 'disconnected') : 'disabled',
          postgres: isPostgresInitialized ? 'initialized' : 'not-initialized',
          redis: isRedisClientReady ? 'client-ready' : 'no-client'
        },
        message: basicSystemsConnected ? 'All basic connections established' : 'Missing basic connections'
      }
    } catch {
      return {
        status: HealthStatus.DOWN,
        timestamp: new Date().toISOString(),
        phase: 'startup',
        error: 'Startup check failed - initialization incomplete',
        message: 'Application still initializing'
      }
    }
  }
}
