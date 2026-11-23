export enum EnvEnum {
  LOCAL = 'local',
  TEST = 'test',
  DEV = 'dev',
  HML = 'hml',
  PRD = 'prod'
}

export function isMongoEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true'
}
