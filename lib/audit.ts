import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DatabaseClient = typeof prisma | Prisma.TransactionClient;

type Entry = {
  actorUserId?: string | null;
  quoteId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function writeAuditLog(client: DatabaseClient, entry: Entry) {
  return client.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      quoteId: entry.quoteId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
      metadata: entry.metadata ?? undefined,
    },
  });
}
