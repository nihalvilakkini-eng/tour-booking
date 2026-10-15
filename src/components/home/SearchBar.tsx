
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [activity, setActivity] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (destination.trim()) {
      params.set("destination", destination.trim());
    }

    if (activity.trim()) {
      params.set("search", activity.trim());
    }

    router.push(`/tours${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <form className="search-box" onSubmit={handleSearch}>
      <label className="search-field">
        <span>📍 Destination</span>
        <input
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Where do you want to go?"
        />
      </label>

      <label className="search-field">
        <span>✦ Experience</span>
        <input
          value={activity}
          onChange={(event) => setActivity(event.target.value)}
          placeholder="Hiking, beach, culture..."
        />
      </label>

      <button className="search-button" type="submit">
        Search Tours
      </button>

      <style jsx>{`
        .search-box {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          align-items: center;
          gap: 18px;
          max-width: 880px;
          margin-top: 45px;
          padding: 16px;
          border-radius: 16px;
          background: white;
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.18);
          color: #172b27;
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          padding: 5px 10px;
        }

        .search-field span {
          font-size: 12px;
          font-weight: 700;
        }

        .search-field input {
          width: 100%;
          min-width: 0;
          padding: 0;
          border: 0;
          outline: none;
          color: #172b27;
          font-size: 13px;
        }

        .search-button {
          min-height: 52px;
          padding: 0 23px;
          border: 0;
          border-radius: 10px;
          background: #087f6e;
          color: white;
          font-weight: 700;
        }

        .search-button:hover {
          background: #066354;
        }

        @media (max-width: 640px) {
          .search-box {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 30px;
            padding: 13px;
          }

          .search-field {
            padding: 10px;
            border-bottom: 1px solid #e5ebe7;
          }
        }
      `}</style>
    </form>
  );
}
