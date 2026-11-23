const { spawnSync } = require("node:child_process");
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

const migrationArgs = dbType === "postgres"
  ? [
      "./node_modules/typeorm/cli.js",
      "migration:generate",
      `src/infra/database/postgres/migrations/${migrationName}`,
      "-d",
      "src/infra/database/postgres/config.ts"
    ]
  : ["./src/infra/database/mongo/config.ts", "new", "-n", migrationName];

console.log(`🚀 Generating migration: ${migrationName}`);
const result = spawnSync(
  process.execPath,
  [require.resolve("ts-node/dist/bin.js"), "-r", "tsconfig-paths/register", ...migrationArgs],
  { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }
);

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.error) {
  console.error(result.error.message);
}
if (result.signal) {
  console.error(`Migration process stopped by ${result.signal}`);
}

// TypeORM exits with code 1 for both an unchanged schema and generation errors.
const schemaUnchanged = dbType === "postgres" && result.status === 1 &&
  result.stdout?.includes("No changes in database schema were found - cannot generate a migration.");

process.exitCode = schemaUnchanged ? 0 : (result.status ?? 1);
