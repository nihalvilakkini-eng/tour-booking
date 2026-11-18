"use client";

export type ImageUploadProgressCallback = (
  current: number,
  total: number,
  stepDescription: string,
  percent: number
) => void;

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses and resizes an image file client-side using HTML5 Canvas.
 * Significantly reduces payload size before network transmission.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // SVG images shouldn't be rasterized via canvas
  if (file.type === "image/svg+xml") {
    return file;
  }

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82,
  } = options;

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Calculate new dimensions preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      } else if (file.size < 300 * 1024) {
        // Image is already small enough in dimension and size
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format (prefer jpeg for photos)
      const outputType = file.type === "image/png" ? "image/jpeg" : file.type;
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't reduce size, keep original
            resolve(file);
            return;
          }

          const cleanName = file.name.replace(/\.[^.]+$/, ".jpg");
          const compressedFile = new File([blob], cleanName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image file directly to Cloudinary using signed upload parameters,
 * falling back to the server-side /api/upload endpoint if direct upload fails.
 */
export async function uploadSingleImageToCloudinary(
  file: File,
  onPercent?: (percent: number) => void
): Promise<string> {
  // Step 1: Compress and resize before upload
  const compressed = await compressImage(file);

  // Step 2: Try direct signed upload to Cloudinary
  try {
    const signRes = await fetch("/api/upload/sign", {
      method: "POST",
      credentials: "include",
    });

    if (signRes.ok) {
      const signData = await signRes.json();
      if (signData.success && signData.data) {
        const { signature, timestamp, apiKey, cloudName, folder } =
          signData.data;

        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append("file", compressed);
        cloudinaryFormData.append("api_key", apiKey);
        cloudinaryFormData.append("timestamp", String(timestamp));
        cloudinaryFormData.append("signature", signature);
        cloudinaryFormData.append("folder", folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        const cloudinaryResult = await new Promise<{ secure_url?: string }>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", uploadUrl);

            if (onPercent && xhr.upload) {
              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  const percent = Math.round((event.loaded / event.total) * 100);
                  onPercent(percent);
                }
              };
            }

            xhr.onload = () => {
              try {
                const json = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) {
                  resolve(json);
                } else {
                  reject(new Error(json?.error?.message || `HTTP ${xhr.status}`));
                }
              } catch {
                reject(new Error(`Failed to parse Cloudinary response (HTTP ${xhr.status})`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error during Cloudinary upload"));
            xhr.send(cloudinaryFormData);
          }
        );

        if (cloudinaryResult.secure_url) {
          return cloudinaryResult.secure_url;
        }
      }
    }
  } catch (directUploadErr) {
    console.warn(
      "Direct Cloudinary upload failed, falling back to /api/upload:",
      directUploadErr
    );
  }

  // Step 3: Fallback to server-side /api/upload endpoint
  const serverFormData = new FormData();
  serverFormData.append("file", compressed);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true;

    if (onPercent && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onPercent(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.success && json.url) {
          resolve(json.url);
        } else {
          reject(new Error(json?.message || `Upload failed with HTTP ${xhr.status}`));
        }
      } catch {
        reject(
          new Error(
            `The upload service returned an unexpected response (HTTP ${xhr.status}).`
          )
        );
      }
    };

    xhr.onerror = () => reject(new Error("Network connection error during image upload"));
    xhr.send(serverFormData);
  });
}

/**
 * Uploads an array of image files sequentially to Cloudinary with progress tracking.
 */
export async function uploadMultipleImagesToCloudinary(
  files: File[],
  onProgress?: ImageUploadProgressCallback
): Promise<string[]> {
  const urls: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const current = i + 1;

    onProgress?.(
      current,
      total,
      `Compressing & uploading image ${current} of ${total} (${file.name})...`,
      Math.round(((current - 1) / total) * 100)
    );

    const url = await uploadSingleImageToCloudinary(file, (percent) => {
      const overallPercent = Math.round(
        ((i + percent / 100) / total) * 100
      );
      onProgress?.(
        current,
        total,
        `Uploading image ${current} of ${total}: ${percent}%`,
        overallPercent
      );
    });

    urls.push(url);
  }

  onProgress?.(total, total, "All images uploaded successfully!", 100);
  return urls;
}

/**
 * Uploads any pending activity images in itinerary days to Cloudinary
 * and returns the updated itinerary days with secure Cloudinary URLs.
 */
export async function uploadItineraryActivityImages<T extends { activities: Array<{ imageFile?: File; image?: string }> }>(
  days: T[],
  onStatus?: (message: string) => void
): Promise<T[]> {
  const cloned: T[] = days.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => ({ ...activity })),
  }));

  for (let d = 0; d < days.length; d++) {
    for (let a = 0; a < days[d].activities.length; a++) {
      const act = days[d].activities[a];
      if (act.imageFile) {
        onStatus?.(`Uploading photo for Day ${d + 1}, activity ${a + 1}...`);
        const secureUrl = await uploadSingleImageToCloudinary(act.imageFile);
        cloned[d].activities[a].image = secureUrl;
        delete cloned[d].activities[a].imageFile;
      }
    }
  }

  return cloned;
}

