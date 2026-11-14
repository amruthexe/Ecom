import { model, models, Schema, type Model, type Types } from "mongoose";

export type GatewayPaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded" | "partially_refunded";

export interface RefundEntry {
  razorpayRefundId: string;
  amountPaise: number;
  status: "pending" | "processed" | "failed";
  reason?: string;
  createdBy: string;
  createdAt: Date;
}

export interface PaymentDoc {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amountPaise: number;
  currency: string;
  status: GatewayPaymentStatus;
  method?: string;
  email?: string;
  contact?: string;
  errorCode?: string;
  errorDescription?: string;
  attempts: number;
  refunds: RefundEntry[];
  refundedPaise: number;
  /** Razorpay fee paid by the customer on top of the order total (customer fee-bearer accounts). */
  feePaise?: number;
  capturedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<PaymentDoc>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "authorized", "captured", "failed", "refunded", "partially_refunded"], default: "created", index: true },
    method: String,
    email: String,
    contact: String,
    errorCode: String,
    errorDescription: String,
    attempts: { type: Number, default: 0 },
    refunds: {
      type: [
        {
          _id: false,
          razorpayRefundId: String,
          amountPaise: Number,
          status: { type: String, enum: ["pending", "processed", "failed"] },
          reason: String,
          createdBy: String,
          createdAt: Date,
        },
      ],
      default: [],
    },
    refundedPaise: { type: Number, default: 0 },
    feePaise: Number,
    capturedAt: Date,
  },
  { timestamps: true },
);

schema.index({ razorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: "string" } } });
schema.index({ createdAt: -1 });

export const Payment: Model<PaymentDoc> = (models.Payment as Model<PaymentDoc>) || model<PaymentDoc>("Payment", schema);
