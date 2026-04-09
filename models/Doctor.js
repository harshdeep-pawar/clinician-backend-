import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    specialization: {
      type: String,
      required: true,
    },

    experience: {
      type: Number, // years
    },

    phone: {
      type: String,
    },

    email: {
      type: String,
      unique: true,
    },

    availability: {
      type: [String], // e.g. ["Mon", "Tue"]
    },
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);