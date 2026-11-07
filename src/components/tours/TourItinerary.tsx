"use client";

import { useState } from "react";
import type { IItineraryDay } from "@/models/Tour";

type TourItineraryProps = {
  days: IItineraryDay[];
};

type ItineraryStop = {
  key: string;
  dayNumber: number;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  activity: IItineraryDay["activities"][number];
};

function getOpenStreetMapUrl(latitude: number, longitude: number) {
  const longitudeOffset = 0.015;
  const latitudeOffset = 0.01;
  const west = Math.max(-180, longitude - longitudeOffset);
  const east = Math.min(180, longitude + longitudeOffset);
  const south = Math.max(-85, latitude - latitudeOffset);
  const north = Math.min(85, latitude + latitudeOffset);
  const params = new URLSearchParams({
    bbox: `${west},${south},${east},${north}`,
    layer: "mapnik",
    marker: `${latitude},${longitude}`,
  });

  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

function getGoogleMapsSearchUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export default function TourItinerary({ days }: TourItineraryProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    () => new Set(days.map((day) => day.dayNumber))
  );
  const stops: ItineraryStop[] = days.flatMap((day, dayIndex) =>
    day.activities.map((activity, activityIndex) => ({
      key: `${dayIndex}-${activityIndex}`,
      dayNumber: day.dayNumber,
      title: activity.title,
      location: activity.location,
      latitude: activity.latitude,
      longitude: activity.longitude,
      activity,
    }))
  );
  const [selectedStopKey, setSelectedStopKey] = useState(
    stops[0]?.key ?? ""
  );
  const selectedStop = stops.find((stop) => stop.key === selectedStopKey);
  const selectedLatitude = selectedStop?.latitude;
  const selectedLongitude = selectedStop?.longitude;

  function toggleDay(dayNumber: number) {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  }

  return (
    <section
      aria-labelledby="tour-itinerary-heading"
      className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
    >
      <header className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          The journey, day by day
        </p>
        <h2
          id="tour-itinerary-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
        >
          Your Trip Itinerary
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Follow the plan, explore each stop, and open the map for directions.
        </p>
      </header>

      <div className="grid gap-8 p-5 sm:p-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          {days.map((day, dayIndex) => {
            const expanded = expandedDays.has(day.dayNumber);
            return (
              <section
                key={`${day.dayNumber}-${day.title}`}
                className="overflow-hidden rounded-2xl border border-slate-200"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`itinerary-day-content-${day.dayNumber}`}
                  onClick={() => toggleDay(day.dayNumber)}
                  className="flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-left transition hover:bg-emerald-50/50 sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-sm font-bold text-white shadow-sm">
                      {day.dayNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Day {day.dayNumber}
                      </span>
                      <span className="mt-1 block truncate font-bold text-slate-900">
                        {day.title || `Day ${day.dayNumber}`}
                      </span>
                    </span>
                    <span className="hidden text-xs text-slate-500 sm:inline">
                      {day.activities.length}{" "}
                      {day.activities.length === 1 ? "stop" : "stops"}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-lg text-emerald-700 transition-transform duration-300 ${
                      expanded ? "rotate-180" : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                <div
                  id={`itinerary-day-content-${day.dayNumber}`}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    expanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="relative space-y-3 border-t border-slate-100 p-4 sm:p-5">
                      {day.activities.length > 0 && (
                        <div
                          aria-hidden="true"
                          className="absolute bottom-8 left-[2.4rem] top-8 w-px bg-emerald-200 sm:left-[2.9rem]"
                        />
                      )}
                      {day.activities.length === 0 ? (
                        <p className="py-2 text-sm text-slate-500">
                          No activities have been added to this day yet.
                        </p>
                      ) : (
                        day.activities.map((activity, activityIndex) => {
                          const stopKey = `${dayIndex}-${activityIndex}`;
                          const selected = selectedStopKey === stopKey;
                          return (
                            <article
                              key={stopKey}
                              className={`relative rounded-2xl border p-4 transition-colors sm:p-5 ${
                                selected
                                  ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-100"
                                  : "border-slate-100 bg-white"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedStopKey(stopKey)}
                                aria-pressed={selected}
                                className="relative z-10 flex w-full items-start gap-3 text-left"
                              >
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-4 border-white text-xs font-bold shadow-sm ${
                                    selected
                                      ? "bg-emerald-700 text-white"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {activityIndex + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-emerald-800">
                                    <time>{activity.startTime}</time>
                                    <span aria-hidden="true">—</span>
                                    <time>{activity.endTime}</time>
                                    <span className="text-slate-400">·</span>
                                    <span>{activity.duration}</span>
                                  </span>
                                  <span className="mt-1 block text-base font-bold text-slate-900">
                                    {activity.title}
                                  </span>
                                  <span className="mt-1 block text-sm text-slate-600">
                                    <span aria-hidden="true">⌖ </span>
                                    {activity.location}
                                  </span>
                                </span>
                              </button>

                              {activity.image && (
                                // Activity images are uploaded to Cloudinary like tour photos.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={activity.image}
                                  alt={activity.title}
                                  loading="lazy"
                                  className="ml-12 mt-4 h-40 w-[calc(100%-3rem)] rounded-xl object-cover sm:h-52"
                                />
                              )}

                              {activity.description && (
                                <p className="ml-12 mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                                  {activity.description}
                                </p>
                              )}

                              <div className="ml-12 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
                                <span>
                                  <span aria-hidden="true">↗ </span>
                                  {activity.travelMode || "Other transport"}
                                </span>
                                {activity.latitude !== undefined &&
                                  activity.longitude !== undefined && (
                                    <span>
                                      {activity.latitude.toFixed(5)},{" "}
                                      {activity.longitude.toFixed(5)}
                                    </span>
                                  )}
                              </div>

                              {activity.instructions && (
                                <p className="ml-12 mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                                  <strong>Good to know:</strong>{" "}
                                  {activity.instructions}
                                </p>
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <aside
          aria-labelledby="itinerary-roadmap-heading"
          className="min-w-0"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
            <div className="border-b border-slate-100 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Follow the route
              </p>
              <h3
                id="itinerary-roadmap-heading"
                className="mt-1 text-lg font-bold text-slate-900"
              >
                Interactive roadmap
              </h3>
            </div>

            {selectedStop &&
            selectedLatitude !== undefined &&
            selectedLongitude !== undefined ? (
              <iframe
                key={selectedStop.key}
                title={`Map showing ${selectedStop.location}`}
                src={getOpenStreetMapUrl(
                  selectedLatitude,
                  selectedLongitude
                )}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-64 w-full border-0 sm:h-72"
              />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 px-6 py-8 text-center sm:min-h-72">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl text-emerald-700 shadow-sm">
                  ⌖
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-800">
                  {selectedStop?.location || "Choose a stop"}
                </p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-600">
                  {selectedStop
                    ? "This stop has no precise coordinates. Search its location name on Google Maps."
                    : "Select an activity to view its location."}
                </p>
                {selectedStop && (
                  <a
                    href={getGoogleMapsSearchUrl(selectedStop.location)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                  >
                    Open in Google Maps <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            )}

            <ol className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {stops.map((stop, index) => {
                const selected = selectedStopKey === stop.key;
                return (
                  <li key={stop.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStopKey(stop.key);
                        setExpandedDays((current) =>
                          new Set(current).add(stop.dayNumber)
                        );
                      }}
                      aria-current={selected ? "location" : undefined}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        selected ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          selected
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          Day {stop.dayNumber} · {stop.activity.startTime}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-800">
                          {stop.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                          {stop.location}
                        </span>
                      </span>
                      <span
                        aria-label={
                          stop.latitude !== undefined &&
                          stop.longitude !== undefined
                            ? "Coordinates available"
                            : "Coordinates unavailable"
                        }
                        className="text-xs text-emerald-700"
                      >
                        {stop.latitude !== undefined &&
                        stop.longitude !== undefined
                          ? "●"
                          : "⌖"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="border-t border-slate-100 px-4 py-3 text-[10px] leading-4 text-slate-500">
              Map data © OpenStreetMap contributors. Select any stop to focus
              its marker.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
