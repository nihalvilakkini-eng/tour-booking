"use client";

import { useState } from "react";
import type { IItineraryDay } from "@/models/Tour";

export type EditableItineraryActivity = {
  title: string;
  startTime: string;
  endTime: string;
  duration: string;
  location: string;
  description: string;
  travelMode: string;
  latitude: string;
  longitude: string;
  instructions: string;
  image: string;
  imageFile?: File;
  imagePreview?: string;
};

export type EditableItineraryDay = {
  dayNumber: number;
  title: string;
  activities: EditableItineraryActivity[];
};

export function appendItineraryToFormData(
  formData: FormData,
  days: EditableItineraryDay[]
) {
  formData.append(
    "itineraryDays",
    JSON.stringify(
      days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        activities: day.activities.map((activity) => ({
          title: activity.title,
          startTime: activity.startTime,
          endTime: activity.endTime,
          duration: activity.duration,
          location: activity.location,
          description: activity.description,
          travelMode: activity.travelMode,
          latitude: activity.latitude,
          longitude: activity.longitude,
          instructions: activity.instructions,
          image: activity.image,
        })),
      }))
    )
  );

  days.forEach((day, dayIndex) => {
    day.activities.forEach((activity, activityIndex) => {
      if (activity.imageFile) {
        formData.append(
          `itineraryImage.${dayIndex}.${activityIndex}`,
          activity.imageFile
        );
      }
    });
  });
}

export function toEditableItinerary(
  days: IItineraryDay[] | undefined
): EditableItineraryDay[] {
  return (days ?? []).map((day, dayIndex) => ({
    dayNumber: dayIndex + 1,
    title: day.title || `Day ${dayIndex + 1}`,
    activities: day.activities.map((activity) => ({
      title: activity.title,
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: activity.duration,
      location: activity.location,
      description: activity.description,
      travelMode: activity.travelMode || "other",
      latitude: activity.latitude === undefined ? "" : String(activity.latitude),
      longitude: activity.longitude === undefined ? "" : String(activity.longitude),
      instructions: activity.instructions || "",
      image: activity.image || "",
    })),
  }));
}

function createActivity(): EditableItineraryActivity {
  return {
    title: "",
    startTime: "",
    endTime: "",
    duration: "",
    location: "",
    description: "",
    travelMode: "other",
    latitude: "",
    longitude: "",
    instructions: "",
    image: "",
  };
}

const fieldClass =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-xs font-semibold text-slate-700";

type TourItineraryBuilderProps = {
  days: EditableItineraryDay[];
  onChange: (days: EditableItineraryDay[]) => void;
};

export default function TourItineraryBuilder({
  days,
  onChange,
}: TourItineraryBuilderProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});

  function updateDay(dayIndex: number, patch: Partial<EditableItineraryDay>) {
    onChange(
      days.map((day, index) =>
        index === dayIndex ? { ...day, ...patch } : day
      )
    );
  }

  function addDay() {
    const dayNumber = days.length + 1;
    onChange([
      ...days,
      {
        dayNumber,
        title: `Day ${dayNumber}`,
        activities: [createActivity()],
      },
    ]);
  }

  function deleteDay(dayIndex: number) {
    onChange(
      days
        .filter((_, index) => index !== dayIndex)
        .map((day, index) => ({ ...day, dayNumber: index + 1 }))
    );
  }

  function updateActivity(
    dayIndex: number,
    activityIndex: number,
    patch: Partial<EditableItineraryActivity>
  ) {
    onChange(
      days.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              activities: day.activities.map((activity, itemIndex) =>
                itemIndex === activityIndex
                  ? { ...activity, ...patch }
                  : activity
              ),
            }
          : day
      )
    );
  }

  function moveActivity(
    dayIndex: number,
    activityIndex: number,
    offset: -1 | 1
  ) {
    const targetIndex = activityIndex + offset;
    const activities = [...days[dayIndex].activities];
    if (targetIndex < 0 || targetIndex >= activities.length) return;
    [activities[activityIndex], activities[targetIndex]] = [
      activities[targetIndex],
      activities[activityIndex],
    ];
    updateDay(dayIndex, { activities });
  }

  function selectActivityImage(
    dayIndex: number,
    activityIndex: number,
    file: File | undefined
  ) {
    const key = `${dayIndex}-${activityIndex}`;
    setImageErrors((previous) => ({ ...previous, [key]: "" }));
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageErrors((previous) => ({
        ...previous,
        [key]: "Choose an image file.",
      }));
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setImageErrors((previous) => ({
        ...previous,
        [key]: "Image must be under 5MB.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateActivity(dayIndex, activityIndex, {
        imageFile: file,
        imagePreview: typeof reader.result === "string" ? reader.result : "",
      });
    };
    reader.onerror = () => {
      setImageErrors((previous) => ({
        ...previous,
        [key]: "Unable to preview this image.",
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Plan every moment
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Tour Itinerary &amp; Roadmap
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Add the days and activities in order. Precise coordinates are
            optional; guests can still find any location by name.
          </p>
        </div>
        <button
          type="button"
          onClick={addDay}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          <span aria-hidden="true">+</span> Add a day
        </button>
      </div>

      {days.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-10 text-center">
          <p className="font-semibold text-slate-800">Your itinerary starts here</p>
          <p className="mt-2 text-sm text-slate-500">
            Add a day, then map out the activities your guests will enjoy.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {days.map((day, dayIndex) => (
            <section
              key={dayIndex}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className={labelClass} htmlFor={`itinerary-day-${dayIndex}`}>
                    Day {dayIndex + 1} title
                  </label>
                  <input
                    id={`itinerary-day-${dayIndex}`}
                    value={day.title}
                    onChange={(event) =>
                      updateDay(dayIndex, { title: event.target.value })
                    }
                    className={fieldClass}
                    maxLength={100}
                    placeholder={`Day ${dayIndex + 1}`}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateDay(dayIndex, {
                        activities: [...day.activities, createActivity()],
                      })
                    }
                    className="min-h-10 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                  >
                    + Add activity
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDay(dayIndex)}
                    className="min-h-10 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    aria-label={`Delete ${day.title || `Day ${dayIndex + 1}`}`}
                  >
                    Delete day
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {day.activities.map((activity, activityIndex) => {
                  const key = `${dayIndex}-${activityIndex}`;
                  const imageSource = activity.imagePreview || activity.image;
                  return (
                    <article
                      key={activityIndex}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                            {activityIndex + 1}
                          </span>
                          <h3 className="font-bold text-slate-900">
                            Activity {activityIndex + 1}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveActivity(dayIndex, activityIndex, -1)}
                            disabled={activityIndex === 0}
                            aria-label={`Move activity ${activityIndex + 1} up`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveActivity(dayIndex, activityIndex, 1)}
                            disabled={activityIndex === day.activities.length - 1}
                            aria-label={`Move activity ${activityIndex + 1} down`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateDay(dayIndex, {
                                activities: day.activities.filter(
                                  (_, index) => index !== activityIndex
                                ),
                              })
                            }
                            aria-label={`Delete activity ${activityIndex + 1}`}
                            className="min-h-9 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className={`${labelClass} sm:col-span-2`}>
                          Activity title *
                          <input
                            value={activity.title}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                title: event.target.value,
                              })
                            }
                            className={fieldClass}
                            maxLength={150}
                            required
                          />
                        </label>
                        <label className={labelClass}>
                          Start time *
                          <input
                            type="time"
                            value={activity.startTime}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                startTime: event.target.value,
                              })
                            }
                            className={fieldClass}
                            required
                          />
                        </label>
                        <label className={labelClass}>
                          End time *
                          <input
                            type="time"
                            value={activity.endTime}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                endTime: event.target.value,
                              })
                            }
                            className={fieldClass}
                            required
                          />
                        </label>
                        <label className={labelClass}>
                          Duration *
                          <input
                            value={activity.duration}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                duration: event.target.value,
                              })
                            }
                            className={fieldClass}
                            maxLength={60}
                            placeholder="1 hour 30 minutes"
                            required
                          />
                        </label>
                        <label className={labelClass}>
                          Travel method
                          <select
                            value={activity.travelMode}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                travelMode: event.target.value,
                              })
                            }
                            className={fieldClass}
                          >
                            <option value="walking">Walking</option>
                            <option value="car">Car</option>
                            <option value="bus">Bus</option>
                            <option value="boat">Boat</option>
                            <option value="bicycle">Bicycle</option>
                            <option value="train">Train</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label className={`${labelClass} sm:col-span-2`}>
                          Location name *
                          <input
                            value={activity.location}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                location: event.target.value,
                              })
                            }
                            className={fieldClass}
                            maxLength={200}
                            placeholder="e.g. Ubud Art Market, Bali"
                            required
                          />
                        </label>
                        <label className={labelClass}>
                          Latitude
                          <input
                            type="number"
                            min="-90"
                            max="90"
                            step="any"
                            value={activity.latitude}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                latitude: event.target.value,
                              })
                            }
                            className={fieldClass}
                            placeholder="-8.5069"
                          />
                        </label>
                        <label className={labelClass}>
                          Longitude
                          <input
                            type="number"
                            min="-180"
                            max="180"
                            step="any"
                            value={activity.longitude}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                longitude: event.target.value,
                              })
                            }
                            className={fieldClass}
                            placeholder="115.2625"
                          />
                        </label>
                        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
                          Description
                          <textarea
                            value={activity.description}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                description: event.target.value,
                              })
                            }
                            className={fieldClass}
                            rows={3}
                            maxLength={2000}
                          />
                        </label>
                        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
                          Important instructions
                          <textarea
                            value={activity.instructions}
                            onChange={(event) =>
                              updateActivity(dayIndex, activityIndex, {
                                instructions: event.target.value,
                              })
                            }
                            className={fieldClass}
                            rows={2}
                            maxLength={1000}
                            placeholder="What should guests bring or know?"
                          />
                        </label>
                      </div>

                      <div className="mt-4">
                        <label className={labelClass} htmlFor={`itinerary-image-${key}`}>
                          Activity image <span className="font-normal text-slate-500">(optional, max 5MB)</span>
                        </label>
                        <input
                          id={`itinerary-image-${key}`}
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            selectActivityImage(
                              dayIndex,
                              activityIndex,
                              event.target.files?.[0]
                            )
                          }
                          className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100"
                        />
                        {imageErrors[key] && (
                          <p role="alert" className="mt-2 text-xs text-rose-700">
                            {imageErrors[key]}
                          </p>
                        )}
                        {imageSource && (
                          <div className="mt-3 flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageSource}
                              alt={`Activity: ${activity.title || "preview"}`}
                              className="h-20 w-28 rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateActivity(dayIndex, activityIndex, {
                                  image: "",
                                  imageFile: undefined,
                                  imagePreview: undefined,
                                })
                              }
                              className="text-xs font-semibold text-rose-700 hover:underline"
                            >
                              Remove image
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
