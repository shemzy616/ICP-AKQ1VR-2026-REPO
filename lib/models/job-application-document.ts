import mongoose, { Document, Schema } from "mongoose";

export type JobDocumentKind = "cv" | "coverLetter";

export interface IJobApplicationDocument extends Document {
  jobApplicationId: mongoose.Types.ObjectId;
  userId: string;
  kind: JobDocumentKind;
  fileName: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationDocumentSchema = new Schema<IJobApplicationDocument>(
  {
    jobApplicationId: {
      type: Schema.Types.ObjectId,
      ref: "JobApplication",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["cv", "coverLetter"],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
      default: "application/pdf",
    },
    size: {
      type: Number,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

JobApplicationDocumentSchema.index(
  { jobApplicationId: 1, kind: 1 },
  { unique: true }
);

export default mongoose.models.JobApplicationDocument ||
  mongoose.model<IJobApplicationDocument>(
    "JobApplicationDocument",
    JobApplicationDocumentSchema
  );
