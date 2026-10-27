const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dbUrl = process.env.DATABASE_URL || "";
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
const pgSchemaPath = path.join(__dirname, "../prisma/schema.postgresql.prisma");

if (isPostgres) {
  console.log("[Build] Detected PostgreSQL DATABASE_URL. Activating PostgreSQL schema...");
  if (fs.existsSync(pgSchemaPath)) {
    fs.copyFileSync(pgSchemaPath, schemaPath);
  }

  try {
    console.log("[Build] Synchronizing database tables (prisma db push)...");
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: process.env,
    });
    console.log("[Build] Database tables successfully created!");

    console.log("[Build] Seeding categories and initial articles (seed.ts)...");
    execSync("npx tsx prisma/seed.ts", {
      stdio: "inherit",
      env: process.env,
    });
    console.log("[Build] Database seeded successfully!");
  } catch (err) {
    console.warn("[Build] Warning during automatic DB migration:", err.message);
  }
} else {
  console.log("[Build] Using local SQLite schema...");
}
