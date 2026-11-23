const { execSync } = require("child_process");
const DBTYPE = ["postgres", "mongo"];

const dbType = process.argv[2];
const migrationName = process.argv[3];

if (!dbType || !DBTYPE.includes(dbType)) {
  console.error("❌ Please provide a database type.\nUsage: npm run migrate <DatabaseType> <MigrationName>");
  process.exit(1);
}

if (!migrationName) {
  console.error("❌ Please provide a migration name.\nUsage: npm run migrate <DatabaseType> <MigrationName>");
  process.exit(1);
}

let cmd = "";
if (dbType === "postgres") {
  const migrationDir = `src/infra/database/postgres/migrations`;
  cmd = `ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate ${migrationDir}/${migrationName} -d src/infra/database/postgres/config.ts`;
} else if (dbType === "mongo") {
  cmd = `ts-node -r tsconfig-paths/register ./src/infra/database/mongo/config.ts new -n ${migrationName}`;
}

console.log(`🚀 Generating migration: ${migrationName}`);
execSync(cmd, { stdio: "inherit" });