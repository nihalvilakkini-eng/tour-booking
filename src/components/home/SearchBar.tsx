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
        <span>📍 DESTINATION</span>
        <input
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Where do you want to go?"
        />
      </label>

      <label className="search-field">
        <span>✦ EXPERIENCE</span>
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
          gap: 10px;
          width: 100%;
          max-width: 780px;
          margin-top: 28px;
          padding: 8px 10px 8px 14px;
          border: 1px solid rgba(245, 158, 11, 0.28);
          border-radius: 16px;
          background: rgba(18, 26, 34, 0.88);
          backdrop-filter: blur(16px);
          box-shadow: 0 20px 44px rgba(0, 0, 0, 0.55);
          color: #f8fafc;
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          padding: 6px 12px;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-field span {
          color: #fbbf24;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .search-field input {
          width: 100%;
          min-width: 0;
          padding: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 500;
        }

        .search-field input::placeholder {
          color: #64748b;
        }

        .search-field:focus-within span {
          color: #f59e0b;
        }

        .search-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-button {
          height: 44px;
          padding: 0 22px;
          border: 0;
          border-radius: 11px;
          background: #f59e0b;
          color: #090d11;
          font-size: 13.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25);
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .search-button:hover {
          background: #fbbf24;
          transform: translateY(-1px);
        }

        .clear-button {
          padding: 0 10px;
          border: 0;
          background: transparent;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          font-weight: 600;
          transition: color 0.15s ease;
        }

        .clear-button:hover {
          color: #fbbf24;
        }

        @media (max-width: 640px) {
          .search-box {
            grid-template-columns: 1fr;
            gap: 6px;
            margin-top: 24px;
            padding: 12px;
            border-radius: 14px;
          }

          .search-field {
            padding: 10px 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            border-right: 0;
          }

          .search-actions {
            flex-wrap: wrap;
            padding-top: 4px;
          }

          .search-button {
            flex: 1;
          }
        }
      `}</style>
    </form>
  );
}