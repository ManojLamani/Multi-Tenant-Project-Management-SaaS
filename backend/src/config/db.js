import mongoose from "mongoose";

const connectDB = async uri => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected successfully");
};

export default connectDB;
