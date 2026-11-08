import { v2 as cloudinary } from "cloudinary";

function getCloudinaryCredentials() {
  return {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };
}

const placeholderValue = /^(your|replace|change|example|<|\{)/i;

function findMissingCloudinaryCredentials(
  credentials: ReturnType<typeof getCloudinaryCredentials>
): string[] {
  return Object.entries(credentials)
    .filter(([, value]) => {
      const normalized = value?.trim() ?? "";
      return !normalized || placeholderValue.test(normalized);
    })
    .map(([name]) => name);
}

export function getMissingCloudinaryCredentials(): string[] {
  return findMissingCloudinaryCredentials(getCloudinaryCredentials());
}

export function configureCloudinary(): void {
  const credentials = getCloudinaryCredentials();
  const missingCredentials = findMissingCloudinaryCredentials(credentials);

  if (missingCredentials.length > 0) {
    throw new Error(
      `Cloudinary is not configured. Set valid values for: ${missingCredentials.join(", ")}`
    );
  }

  cloudinary.config({
    cloud_name: credentials.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: credentials.CLOUDINARY_API_KEY?.trim(),
    api_secret: credentials.CLOUDINARY_API_SECRET?.trim(),
  });
}

export default cloudinary;