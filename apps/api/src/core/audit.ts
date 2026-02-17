import db from "@/databases/drizzle/connection";
import { auditLog } from "@/models/drizzle/rbac.model";

interface AuditMetadata {
  requestId?: string | null;
  ip?: string | null;
  [key: string]: unknown;
}

export interface WriteAuditLogInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: AuditMetadata;
}

export const writeAuditLog = async ({
  actorUserId,
  action,
  entityType,
  entityId,
  metadata = {}
}: WriteAuditLogInput): Promise<void> => {
  await db.insert(auditLog).values({
    actorUserId: actorUserId ?? null,
    action,
    entityType,
    entityId,
    metadata
  });
};
