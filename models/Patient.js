import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    age: {
      type: Number,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      unique: true,
    },

    address: {
      type: String,
    },

    medicalHistory: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt auto add
  }
);

export default mongoose.model("Patient", patientSchema);