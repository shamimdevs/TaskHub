import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient instance, reused across hot reloads in dev so we don't
 * exhaust the connection pool. In production a fresh module means a fresh client.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
