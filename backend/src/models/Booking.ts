import { Schema, model, Document, Types } from 'mongoose';

export type BookingStatus = 'Pending' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';

export interface IBooking extends Document {
  farmer_id: Types.ObjectId;
  service_id: Types.ObjectId;
  provider_id: Types.ObjectId;
  status: BookingStatus;
  date: Date;
  timeSlot?: string;
  farmAddress?: string;
  cropType?: string;
  areaAcres?: number;
  specialInstructions?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  feedbackPromptSent: boolean;
}

const BookingSchema = new Schema<IBooking>(
  {
    farmer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    service_id: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    date: { type: Date, required: true },
    timeSlot: { type: String },
    farmAddress: { type: String },
    cropType: { type: String },
    areaAcres: { type: Number },
    specialInstructions: { type: String },
    cancelledBy: { type: String },
    cancellationReason: { type: String },
    feedbackPromptSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BookingSchema.index({ status: 1, date: 1 });
BookingSchema.index({ farmer_id: 1 });
BookingSchema.index({ provider_id: 1 });

export const Booking = model<IBooking>('Booking', BookingSchema);
