import { z } from 'zod'

export enum HealthStatus {
  UP = `UP 🟢`,
  DOWN = `DOWN 🔴`,
  DISABLED = 'DISABLED'
}

const databaseConnection = z.object({
  active: z.number(),
  available: z.number(),
  current: z.number(),
  totalCreated: z.number()
})
const databaseMemory = z.object({
  ramUsed: z.union([z.number(), z.string()]),
  reservedMemory: z.union([z.number(), z.string()])
})
const databaseHealth = z.object({ status: z.string(), connection: databaseConnection, memory: databaseMemory })
const load = z.object({ load: z.number(), status: z.string() })
const memory = z.object({
  process: z.object({ usedRam: z.string(), heapTotal: z.string(), heapUsed: z.string(), external: z.string() }),
  v8: z.object({
    totalHeapSize: z.string(),
    usedHeapSize: z.string(),
    executableHeapSize: z.string(),
    heapSizeLimit: z.string()
  })
})

export const healthReadinessSchema = z.object({
  server: z.string(),
  version: z.string(),
  mongo: z.union([databaseHealth, z.object({ status: z.literal(HealthStatus.DISABLED) })]),
  postgres: databaseHealth,
  redisState: z.string(),
  network: z.object({ latency: z.string(), connections: z.number() }),
  memory,
  cpu: z.object({
    cpus: z.number(),
    globalAvarage: z.object({ lastMinute: load, lastFiveMinutes: load, lastFifteenMinutes: load }),
    cores: z.array(z.object({ core: z.number(), load: z.string() }))
  })
})

export type HealthOutput = z.infer<typeof healthReadinessSchema>
export type MemotyOutput = z.infer<typeof memory>
export type Load = z.infer<typeof load>
export type DatabaseConnectionOutput = z.infer<typeof databaseConnection>
export type DatabaseMemoryOutput = z.infer<typeof databaseMemory>
