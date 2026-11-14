import { model, models, Schema, type Model, type Types } from "mongoose";

export interface AuditLogDoc {
  _id: Types.ObjectId;
  actorId: string;
  actorEmail: string;
  action: string; // e.g. "product.create"
  entity: string; // e.g. "product"
  entityId: string;
  summary: string;
  changes?: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<AuditLogDoc>(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    summary: { type: String, required: true, maxlength: 500 },
    changes: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ entity: 1, entityId: 1, createdAt: -1 });
schema.index({ createdAt: -1 });

export const AuditLog: Model<AuditLogDoc> = (models.AuditLog as Model<AuditLogDoc>) || model<AuditLogDoc>("AuditLog", schema);
