import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

// Upload an image
const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error("File path is required");
    }
    const imgRes = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });
    return imgRes.secure_url; // Return the secure URL of the uploaded image
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    fs.unlinkSync(filePath); // Delete the file from the local system
    throw error;
  }
};

export { uploadOnCloudinary };
