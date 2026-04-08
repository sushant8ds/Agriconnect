import { Schema, model, Document } from 'mongoose';

export interface IKnowledgeEntry extends Document {
  keywords: string[];
  disease: string;
  crop: string;
  severity: string;
  treatment: string;
  prevention: string;
  addedBy: string;
  isActive: boolean;
}

const KnowledgeEntrySchema = new Schema<IKnowledgeEntry>(
  {
    keywords: { type: [String], required: true },
    disease: { type: String, required: true },
    crop: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Severe'], default: 'Medium' },
    treatment: { type: String, required: true },
    prevention: { type: String, required: true },
    addedBy: { type: String, default: 'Admin' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const KnowledgeEntry = model<IKnowledgeEntry>('KnowledgeEntry', KnowledgeEntrySchema);
