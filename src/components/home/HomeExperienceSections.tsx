"use client";

import { useEffect, useState } from "react";
import { Compass, Globe2, ShieldCheck, Star } from "lucide-react";
import { apiRequest } from "@/lib/api";

type Review = {
  _id?: string;
  rating: number;
  comment: string;
  createdAt?: string;
  user?: { name?: string; lastName?: string } | string | null;
  tour?: { title?: string; destination?: string } | string | null;
};

const reasons = [
  {
    icon: Compass,
    title: "Experiences with a point of view",
    description:
      "Compare destinations, activities, and tour details in one considered place.",
  },
  {
    icon: ShieldCheck,
    title: "Clear before you book",
    description:
      "Review dates, group sizes, pricing, and inclusions before sending a request.",
  },
  {
    icon: Globe2,
    title: "Room to travel your way",
    description:
      "Find everything from local outings to memorable journeys around the world.",
  },
];

function reviewerName(user: Review["user"]): string {
  if (!user || typeof user !== "object") return "Wayora traveller";
  return [user.name, user.lastName].filter(Boolean).join(" ") || "Wayora traveller";
}

function tourLabel(tour: Review["tour"]): string {
  if (!tour || typeof tour !== "object") return "Wayora experience";
  return [tour.title, tour.destination].filter(Boolean).join(" · ") || "Wayora experience";
}

export default function HomeExperienceSections() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        const result = await apiRequest<{ data?: Review[] }>("/api/reviews");
        if (active) setReviews((result.data ?? []).slice(0, 3));
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReviews();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="section why-wayora">
        <div className="container why-wayora-layout">
          <div className="why-wayora-intro">
            <span className="eyebrow">A BETTER WAY TO GET AWAY</span>
            <h2 className="section-heading">Travel planning, made thoughtful.</h2>
            <p className="section-description">
              Find a trip that feels like yours, with the details you need to
              choose with confidence.
            </p>
          </div>

          <div className="why-wayora-grid">
            {reasons.map(({ icon: Icon, title, description }, index) => (
              <article className="why-wayora-item" key={title}>
                <span className="why-wayora-number">0{index + 1}</span>
                <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {!loadError && <section className="section traveler-stories">
        <div className="container">
          <div className="traveler-stories-heading">
            <div>
              <span className="eyebrow">NOTES FROM THE ROAD</span>
              <h2 className="section-heading">Experiences worth sharing.</h2>
            </div>
          </div>

          {loading ? (
            <p className="section-description">Loading traveller reviews...</p>
          ) : reviews.length > 0 ? (
            <div className="traveler-review-grid">
              {reviews.map((review, index) => (
                <article className="traveler-review" key={review._id ?? index}>
                  <div className="traveler-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, starIndex) => (
                      <Star
                        key={starIndex}
                        size={15}
                        fill={starIndex < review.rating ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="traveler-review-comment">“{review.comment}”</p>
                  <div className="traveler-review-author">
                    <strong>{reviewerName(review.user)}</strong>
                    <span>{tourLabel(review.tour)}</span>
                    {review.createdAt && (
                      <time dateTime={review.createdAt}>
                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="traveler-stories-empty">
              Traveller reviews will appear here as guests share their experiences.
            </p>
          )}
        </div>
      </section>}

      <style jsx>{`
        .why-wayora {
          background: #fbfcfa;
        }

        .why-wayora-layout {
          display: grid;
          grid-template-columns: minmax(230px, 0.8fr) minmax(0, 1.7fr);
          gap: 60px;
          align-items: start;
        }

        .why-wayora-intro {
          max-width: 370px;
        }

        .eyebrow {
          display: block;
          margin-bottom: 12px;
          color: #0e715d;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .why-wayora-intro .section-heading,
        .traveler-stories .section-heading {
          font-size: 32px;
        }

        .why-wayora-intro .section-description {
          max-width: 350px;
        }

        .why-wayora-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid #e1e8e3;
        }

        .why-wayora-item {
          position: relative;
          min-width: 0;
          padding: 25px 20px 10px 0;
        }

        .why-wayora-item + .why-wayora-item {
          padding-left: 20px;
          border-left: 1px solid #e1e8e3;
        }

        .why-wayora-item > svg {
          color: #0e715d;
        }

        .why-wayora-number {
          display: block;
          margin-bottom: 22px;
          color: #b98550;
          font-size: 11px;
          font-weight: 800;
        }

        .why-wayora-item h3 {
          margin: 17px 0 8px;
          font-size: 16px;
          line-height: 1.4;
        }

        .why-wayora-item p {
          margin: 0;
          color: #68786f;
          font-size: 13px;
          line-height: 1.7;
        }

        .traveler-stories {
          background: #f2f6f3;
        }

        .traveler-stories-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 28px;
        }

        .traveler-review-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .traveler-review {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 225px;
          padding: 24px;
          border: 1px solid #e0e8e2;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(23, 45, 37, 0.045);
        }

        .traveler-review-stars {
          display: flex;
          gap: 3px;
          color: #b98550;
        }

        .traveler-review-comment {
          margin: 18px 0 24px;
          color: #30453b;
          font-family: "Manrope", sans-serif;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.65;
        }

        .traveler-review-author {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: auto;
        }

        .traveler-review-author strong {
          color: #1a2e27;
          font-size: 13px;
        }

        .traveler-review-author span {
          color: #78867e;
          font-size: 11px;
        }

        .traveler-review-author time {
          margin-top: 5px;
          color: #9aa59f;
          font-size: 11px;
        }

        .traveler-stories-empty {
          padding: 28px;
          border: 1px solid #e0e8e2;
          border-radius: 8px;
          background: #fff;
          color: #68786f;
          text-align: center;
        }

        @media (max-width: 900px) {
          .why-wayora-layout {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }

        @media (max-width: 640px) {
          .why-wayora-grid,
          .traveler-review-grid {
            grid-template-columns: 1fr;
          }

          .why-wayora-item,
          .why-wayora-item + .why-wayora-item {
            padding: 18px 0;
            border-left: 0;
            border-bottom: 1px solid #e1e8e3;
          }

          .why-wayora-number {
            margin-bottom: 14px;
          }

          .why-wayora-intro .section-heading,
          .traveler-stories .section-heading {
            font-size: 27px;
          }

          .traveler-review {
            min-height: 190px;
          }
        }
      `}</style>
    </>
  );
}