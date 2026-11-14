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
      className="overflow-hidden rounded-3xl border border-white/10 bg-[#121a22] shadow-xl"
    >
      <header className="border-b border-white/10 bg-gradient-to-br from-amber-500/10 via-[#121a22] to-[#0b1116] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400">
          The journey, day by day
        </p>
        <h2
          id="tour-itinerary-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          Your Trip Itinerary
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
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
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1116]"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`itinerary-day-content-${day.dayNumber}`}
                  onClick={() => toggleDay(day.dayNumber)}
                  className="flex w-full items-center justify-between gap-4 bg-[#121a22] px-4 py-4 text-left transition hover:bg-white/[0.04] sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-sm font-extrabold text-slate-950 shadow-sm">
                      {day.dayNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                        Day {day.dayNumber}
                      </span>
                      <span className="mt-1 block truncate font-bold text-white">
                        {day.title || `Day ${day.dayNumber}`}
                      </span>
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:inline">
                      {day.activities.length}{" "}
                      {day.activities.length === 1 ? "stop" : "stops"}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-lg text-amber-400 transition-transform duration-300 ${
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
                    <div className="relative space-y-3 border-t border-white/10 p-4 sm:p-5">
                      {day.activities.length > 0 && (
                        <div
                          aria-hidden="true"
                          className="absolute bottom-8 left-[2.4rem] top-8 w-px bg-amber-500/25 sm:left-[2.9rem]"
                        />
                      )}
                      {day.activities.length === 0 ? (
                        <p className="py-2 text-sm text-slate-400">
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
                                  ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                                  : "border-white/10 bg-[#121a22]"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedStopKey(stopKey)}
                                aria-pressed={selected}
                                className="relative z-10 flex w-full items-start gap-3 text-left"
                              >
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold shadow-sm ${
                                    selected
                                      ? "border-amber-400 bg-amber-500 text-slate-950"
                                      : "border-white/15 bg-[#0b1116] text-amber-400"
                                  }`}
                                >
                                  {activityIndex + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-amber-400">
                                    <time>{activity.startTime}</time>
                                    <span aria-hidden="true">—</span>
                                    <time>{activity.endTime}</time>
                                    <span className="text-slate-600">·</span>
                                    <span className="text-slate-300">{activity.duration}</span>
                                  </span>
                                  <span className="mt-1 block text-base font-bold text-white">
                                    {activity.title}
                                  </span>
                                  <span className="mt-1 block text-sm text-slate-400">
                                    <span aria-hidden="true">⌖ </span>
                                    {activity.location}
                                  </span>
                                </span>
                              </button>

                              {activity.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={activity.image}
                                  alt={activity.title}
                                  loading="lazy"
                                  className="ml-12 mt-4 h-40 w-[calc(100%-3rem)] rounded-xl border border-white/10 object-cover sm:h-52"
                                />
                              )}

                              {activity.description && (
                                <p className="ml-12 mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">
                                  {activity.description}
                                </p>
                              )}

                              <div className="ml-12 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-400">
                                <span>
                                  <span aria-hidden="true" className="text-amber-400">↗ </span>
                                  {activity.travelMode || "Other transport"}
                                </span>
                                {activity.latitude !== undefined &&
                                  activity.longitude !== undefined && (
                                    <span className="text-slate-500">
                                      {activity.latitude.toFixed(5)},{" "}
                                      {activity.longitude.toFixed(5)}
                                    </span>
                                  )}
                              </div>

                              {activity.instructions && (
                                <p className="ml-12 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-5 text-amber-200">
                                  <strong className="text-amber-400">Good to know:</strong>{" "}
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
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1116] shadow-xl xl:sticky xl:top-24">
            <div className="border-b border-white/10 bg-[#121a22] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                Follow the route
              </p>
              <h3
                id="itinerary-roadmap-heading"
                className="mt-1 text-lg font-bold text-white"
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
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 to-[#0b1116] px-6 py-8 text-center sm:min-h-72">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-500/30 bg-[#121a22] text-xl text-amber-400 shadow-sm">
                  ⌖
                </span>
                <p className="mt-4 text-sm font-semibold text-white">
                  {selectedStop?.location || "Choose a stop"}
                </p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">
                  {selectedStop
                    ? "This stop has no precise coordinates. Search its location name on Google Maps."
                    : "Select an activity to view its location."}
                </p>
                {selectedStop && (
                  <a
                    href={getGoogleMapsSearchUrl(selectedStop.location)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
                  >
                    Open in Google Maps <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            )}

            <ol className="max-h-80 divide-y divide-white/10 overflow-y-auto">
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
                        selected ? "bg-amber-500/15" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          selected
                            ? "bg-amber-500 text-slate-950"
                            : "bg-[#121a22] text-slate-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-amber-400">
                          Day {stop.dayNumber} · {stop.activity.startTime}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-white">
                          {stop.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">
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
                        className="text-xs text-amber-400"
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
            <p className="border-t border-white/10 bg-[#121a22] px-4 py-3 text-[10px] leading-4 text-slate-500">
              Map data © OpenStreetMap contributors. Select any stop to focus
              its marker.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}