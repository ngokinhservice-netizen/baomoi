import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    let adjustedUrl = dbUrl;
    if (!adjustedUrl.includes("connection_limit=")) {
      adjustedUrl += (adjustedUrl.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=10";
    }
    return new PrismaClient({
      datasources: {
        db: {
          url: adjustedUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
