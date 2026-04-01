import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["owner", "manager", "member"],
    default: "member"
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  }
}, { timestamps: true });

export default mongoose.model("User", UserSchema);