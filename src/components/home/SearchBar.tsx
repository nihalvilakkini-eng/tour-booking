
"use client";

import { FormEvent, useState } from "react";

type SearchBarProps = {
  onSearch: (destination: string, activity: string) => void;
  onClear: () => void;
};

export default function SearchBar({
  onSearch,
  onClear,
}: SearchBarProps) {
  const [destination, setDestination] = useState("");
  const [activity, setActivity] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSearch(destination.trim(), activity.trim());
  }

  function handleClear() {
    setDestination("");
    setActivity("");
    onClear();
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

      <div className="search-actions">
        <button className="search-button" type="submit">
          Search Tours
        </button>

        {(destination || activity) && (
          <button
            className="clear-button"
            type="button"
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>

      <style jsx>{`
        .search-box {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          align-items: center;
          gap: 14px;
          width: 100%;
          max-width: var(--site-content-max);
          margin-top: 40px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          border-radius: 12px;
          background: white;
          box-shadow: 0 18px 42px rgba(9, 29, 24, 0.2);
          color: #172b27;
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
          padding: 7px 12px;
          border-right: 1px solid #e8ede9;
        }

        .search-field span {
          color: #43574f;
          font-size: 11px;
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

        .search-field:focus-within span {
          color: #087f6e;
        }

        .search-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-button {
          min-height: 50px;
          padding: 0 21px;
          border: 0;
          border-radius: 8px;
          background: #087f6e;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .search-button:hover {
          background: #066354;
          transform: translateY(-1px);
        }

        .clear-button {
          border: 0;
          background: transparent;
          color: #64746b;
          cursor: pointer;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .search-box {
            grid-template-columns: 1fr;
            gap: 5px;
            margin-top: 28px;
            padding: 10px;
            border-radius: 10px;
          }

          .search-field {
            padding: 11px 9px;
            border-bottom: 1px solid #e5ebe7;
            border-right: 0;
          }

          .search-actions {
            flex-wrap: wrap;
          }

          .search-button {
            flex: 1;
          }
        }
      `}</style>
    </form>
  );
}
