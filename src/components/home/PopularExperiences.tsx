"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type Experience = {
  _id?: string;
  name: string;
  description: string;
  image: string;
  order?: number;
};

export default function PopularExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExperiences() {
      try {
        setError("");
        const response = await fetch("/api/experiences", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load experiences.");
        }

        if (active) {
          setExperiences(Array.isArray(result.data) ? result.data : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load experiences."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadExperiences();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="section destinations popular-experiences">
      <div className="container">
        <span className="eyebrow">HANDPICKED FOR YOU</span>
        <h2 className="section-heading">Popular experiences</h2>
        <p className="section-description">
          Thoughtfully curated experiences for your next escape.
        </p>

        {loading && (
          <p className="popular-status">Discovering amazing experiences...</p>
        )}

        {!loading && error && (
          <div className="popular-status error">
            <p>We couldn’t load experiences from the server.</p>
            <p>{error}</p>
            <button className="popular-retry" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && experiences.length === 0 && (
          <p className="popular-status">
            Popular experiences will appear here once they are published.
          </p>
        )}

        {!loading && !error && experiences.length > 0 && (
          <div className="destination-grid">
            {experiences.map((experience) => (
              <Link
                key={experience._id || experience.name}
                href="/tours"
                className="destination-card"
                aria-label={`Explore ${experience.name}`}
              >
                <span className="destination-image">
                  <Image
                    src={experience.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 850px) 50vw, 25vw"
                    className="destination-photo"
                    unoptimized
                  />
                </span>
                <span className="destination-info">
                  <span className="destination-country">Experience</span>
                  <strong>{experience.name}</strong>
                  <span className="destination-description">
                    {experience.description}
                  </span>
                  <span className="discover">
                    Explore <span aria-hidden="true">↗</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .popular-status {
          padding: 48px 0;
          color: #718079;
          line-height: 1.8;
        }

        .popular-status.error {
          color: #a32929;
        }

        .popular-retry {
          padding: 9px 14px;
          border: 1px solid #087f6e;
          border-radius: 8px;
          background: white;
          color: #087f6e;
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
