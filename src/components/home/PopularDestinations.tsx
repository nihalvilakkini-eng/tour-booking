"use client";
import Link from "next/link";

const destinations = [
  {
    name: "Bali",
    country: "Indonesia",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80",
    search: "Bali",
  },
  {
    name: "Swiss Alps",
    country: "Switzerland",
    image:
      "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80",
    search: "Swiss Alps",
  },
  {
    name: "Maldives",
    country: "Indian Ocean",
    image:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80",
    search: "Maldives",
  },
  {
    name: "Dubai",
    country: "United Arab Emirates",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
    search: "Dubai",
  },
];

export default function PopularDestinations() {
  return (
    <section className="section destinations">
      <div className="container">
        <span className="eyebrow">EXPLORE THE WORLD</span>
        <h2 className="section-heading">Where will you go next?</h2>
        <p className="section-description">
          From peaceful beaches to breathtaking mountain escapes.
        </p>

        <div className="destination-grid">
          {destinations.map((destination) => (
            <Link
              key={destination.name}
              href={`/tours?destination=${encodeURIComponent(
                destination.search
              )}`}
              className="destination-card"
              style={{ backgroundImage: `url("${destination.image}")` }}
            >
              <span className="destination-info">
                <span>{destination.country}</span>
                <strong>{destination.name}</strong>
                <span className="discover">Discover experiences ↗</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .eyebrow {
          display: block;
          margin-bottom: 10px;
          color: #087f6e;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .destination-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-top: 32px;
        }

        .destination-card {
          position: relative;
          display: flex;
          min-height: 310px;
          align-items: end;
          overflow: hidden;
          border-radius: 16px;
          background-position: center;
          background-size: cover;
          transition: transform 0.25s;
        }

        .destination-card::before {
          position: absolute;
          inset: 0;
          content: "";
          background: linear-gradient(
            180deg,
            transparent 25%,
            rgba(9, 30, 26, 0.82) 100%
          );
          transition: background 0.25s;
        }

        .destination-card:hover {
          transform: translateY(-5px);
        }

        .destination-info {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 20px;
          color: white;
        }

        .destination-info span {
          font-size: 12px;
        }

        .destination-info strong {
          font-size: 24px;
        }

        .destination-info .discover {
          color: #c9f7e7;
        }

        @media (max-width: 850px) {
          .destination-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 480px) {
          .destination-grid {
            gap: 12px;
          }

          .destination-card {
            min-height: 230px;
          }

          .destination-info {
            padding: 13px;
          }

          .destination-info strong {
            font-size: 19px;
          }
        }
      `}</style>
    </section>
  );
}
