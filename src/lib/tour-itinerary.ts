import type { IItineraryActivity, IItineraryDay } from "@/models/Tour";

type ItineraryValidationResult =
  | { itineraryDays: IItineraryDay[] }
  | { error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function readCoordinate(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number
): number | undefined | string {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" && typeof value !== "string") {
    return `${field} must be a number`;
  }

  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
    return `${field} must be between ${minimum} and ${maximum}`;
  }

  return coordinate;
}

export function parseItineraryDays(value: unknown): ItineraryValidationResult {
  let input = value;

  if (typeof input === "string") {
    try {
      input = JSON.parse(input) as unknown;
    } catch {
      return { error: "The tour itinerary must be valid JSON." };
    }
  }

  if (input === undefined || input === null || input === "") {
    return { itineraryDays: [] };
  }
  if (!Array.isArray(input)) {
    return { error: "The tour itinerary must be a list of days." };
  }

  const itineraryDays: IItineraryDay[] = [];

  for (const [dayIndex, rawDay] of input.entries()) {
    if (!isRecord(rawDay) || !Array.isArray(rawDay.activities)) {
      return { error: `Day ${dayIndex + 1} must include an activities list.` };
    }

    const title = readText(rawDay.title);
    if (title === null) {
      return { error: `Day ${dayIndex + 1} has an invalid title.` };
    }
    if (title.length > 100) {
      return { error: `Day ${dayIndex + 1} title must be 100 characters or fewer.` };
    }

    const activities: IItineraryActivity[] = [];
    for (const [activityIndex, rawActivity] of rawDay.activities.entries()) {
      const label = `Day ${dayIndex + 1}, activity ${activityIndex + 1}`;
      if (!isRecord(rawActivity)) {
        return { error: `${label} must be an object.` };
      }

      const activityTitle = readText(rawActivity.title);
      const startTime = readText(rawActivity.startTime);
      const endTime = readText(rawActivity.endTime);
      const duration = readText(rawActivity.duration);
      const location = readText(rawActivity.location);
      const description =
        rawActivity.description === undefined
          ? ""
          : readText(rawActivity.description);
      const travelMode =
        rawActivity.travelMode === undefined
          ? "other"
          : readText(rawActivity.travelMode);
      const instructions =
        rawActivity.instructions === undefined
          ? ""
          : readText(rawActivity.instructions);
      const image =
        rawActivity.image === undefined ? "" : readText(rawActivity.image);

      if (!activityTitle || !startTime || !endTime || !duration || !location) {
        return {
          error: `${label} needs a title, start and end time, duration, and location.`,
        };
      }
      if (
        activityTitle.length > 150 ||
        duration.length > 60 ||
        location.length > 200 ||
        (description?.length ?? 0) > 2000 ||
        (travelMode?.length ?? 0) > 50 ||
        (instructions?.length ?? 0) > 1000
      ) {
        return { error: `${label} contains text that exceeds the allowed length.` };
      }
      if (
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime)
      ) {
        return { error: `${label} must use valid 24-hour times.` };
      }
      if (endTime <= startTime) {
        return { error: `${label} end time must be after its start time.` };
      }
      if (
        description === null ||
        travelMode === null ||
        instructions === null ||
        image === null
      ) {
        return { error: `${label} contains an invalid text field.` };
      }
      if (image && (!image.startsWith("https://") || image.length > 2048)) {
        return { error: `${label} image must be an HTTPS image URL.` };
      }

      const latitude = readCoordinate(rawActivity.latitude, "Latitude", -90, 90);
      const longitude = readCoordinate(rawActivity.longitude, "Longitude", -180, 180);
      if (typeof latitude === "string") return { error: `${label}: ${latitude}.` };
      if (typeof longitude === "string") return { error: `${label}: ${longitude}.` };
      if ((latitude === undefined) !== (longitude === undefined)) {
        return { error: `${label} must include both coordinates or neither.` };
      }

      activities.push({
        title: activityTitle,
        startTime,
        endTime,
        duration,
        location,
        description,
        travelMode: travelMode || "other",
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(image ? { image } : {}),
        ...(instructions ? { instructions } : {}),
      });
    }

    itineraryDays.push({
      dayNumber: dayIndex + 1,
      title: title || `Day ${dayIndex + 1}`,
      activities,
    });
  }

  return { itineraryDays };
}

export type ItineraryImageUpload = {
  dayIndex: number;
  activityIndex: number;
  file: File;
};

export function readItineraryImageUploads(
  formData: FormData,
  itineraryDays: IItineraryDay[]
): { uploads: ItineraryImageUpload[] } | { error: string } {
  const uploads: ItineraryImageUpload[] = [];

  for (const [field, value] of formData.entries()) {
    const match = /^itineraryImage\.(\d+)\.(\d+)$/.exec(field);
    if (!match) continue;

    const dayIndex = Number(match[1]);
    const activityIndex = Number(match[2]);
    if (
      dayIndex >= itineraryDays.length ||
      activityIndex >= (itineraryDays[dayIndex]?.activities.length ?? 0)
    ) {
      return { error: "An itinerary image does not match an activity." };
    }
    if (!(value instanceof File) || !value.type.startsWith("image/")) {
      return { error: "Itinerary activity images must be image files." };
    }
    if (value.size === 0 || value.size > 5 * 1024 * 1024) {
      return { error: "Each itinerary activity image must be under 5MB." };
    }
    if (uploads.some((upload) => upload.dayIndex === dayIndex && upload.activityIndex === activityIndex)) {
      return { error: "Only one image can be uploaded for each activity." };
    }

    uploads.push({ dayIndex, activityIndex, file: value });
  }

  return { uploads };
}
