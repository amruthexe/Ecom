import "server-only";
import type { ClientSession } from "mongoose";
import type { StaffUser } from "@/lib/permissions";
import { AuditLog } from "./models/audit-log";

export async function audit(
  actor: StaffUser,
  entry: { action: string; entity: string; entityId: string; summary: string; changes?: Record<string, unknown> },
  session?: ClientSession,
): Promise<void> {
  await AuditLog.create([{ actorId: actor.id, actorEmail: actor.email, ...entry }], { session });
}
