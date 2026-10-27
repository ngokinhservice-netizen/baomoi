const fs = require("fs");
const path = require("path");

const dbUrl = process.env.DATABASE_URL || "";
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
const pgSchemaPath = path.join(__dirname, "../prisma/schema.postgresql.prisma");

if (isPostgres) {
  console.log("[Build] Detected PostgreSQL DATABASE_URL. Activating PostgreSQL schema...");
  if (fs.existsSync(pgSchemaPath)) {
    fs.copyFileSync(pgSchemaPath, schemaPath);
  }
} else {
  console.log("[Build] Using local SQLite schema...");
}
