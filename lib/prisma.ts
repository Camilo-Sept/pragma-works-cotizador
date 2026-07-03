import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// PrismaClient mantiene conexiones a la base de datos.
// En desarrollo, Next.js puede recargar módulos varias veces; este singleton evita
// crear muchas conexiones durante hot reload y reduce errores por exceso de conexiones.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
