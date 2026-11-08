import cloudinary, { configureCloudinary } from "@/lib/cloudinary";

async function uploadImage(file: File, folder: string): Promise<string> {
  configureCloudinary();

  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

export async function uploadTourImage(file: File): Promise<string> {
  return uploadImage(file, "tour-booking/tours");
}

export async function uploadDestinationImage(file: File): Promise<string> {
  return uploadImage(file, "tour-booking/destinations");
}

export async function uploadExperienceImage(file: File): Promise<string> {
  return uploadImage(file, "tour-booking/experiences");
}
