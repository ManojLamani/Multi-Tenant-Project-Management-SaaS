import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

export default mongoose.model("Organization", OrganizationSchema);