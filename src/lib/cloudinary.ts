import { v2 as cloudinary } from "cloudinary";

const cloudinaryCredentials = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

const placeholderValue = /^(your|replace|change|example|<|\{)/i;

export function getMissingCloudinaryCredentials(): string[] {
  return Object.entries(cloudinaryCredentials)
    .filter(([, value]) => {
      const normalized = value?.trim() ?? "";
      return !normalized || placeholderValue.test(normalized);
    })
    .map(([name]) => name);
}

export function configureCloudinary(): void {
  const missingCredentials = getMissingCloudinaryCredentials();

  if (missingCredentials.length > 0) {
    throw new Error(
      `Cloudinary is not configured. Set valid values for: ${missingCredentials.join(", ")}`
    );
  }

  cloudinary.config({
    cloud_name: cloudinaryCredentials.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: cloudinaryCredentials.CLOUDINARY_API_KEY?.trim(),
    api_secret: cloudinaryCredentials.CLOUDINARY_API_SECRET?.trim(),
  });
}

export default cloudinary;