import mongoose, { Schema } from "mongoose";

export type CounterDocument = {
  _id: string;
  seq: number;
  createdAt: Date;
  updatedAt: Date;
};

const counterSchema = new Schema<CounterDocument>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

export const CounterModel = mongoose.model<CounterDocument>("Counter", counterSchema);
