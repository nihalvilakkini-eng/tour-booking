import Link from "next/link";
import Image from "next/image";

const destinations = [
  {
    name: "Bali",
    country: "Indonesia",
    image: "/images/bali.jpg",
    description:
      "Find your slow rhythm among sacred temples, lush terraces, and sunlit shores.",
    search: "Bali",
  },
  {
    name: "Dubai",
    country: "United Arab Emirates",
    image: "/images/dubai.jpg",
    description:
      "Experience a city of soaring icons, desert adventures, and golden evenings.",
    search: "Dubai",
  },
  {
    name: "Maldives",
    country: "Indian Ocean",
    image: "/images/maldives.jpg",
    description:
      "Escape to clear turquoise lagoons, coral gardens, and overwater villas.",
    search: "Maldives",
  },
  {
    name: "Swiss Alps",
    country: "Switzerland",
    image: "/images/swiss-alps.jpg",
    description:
      "Breathe in crisp alpine air beneath snowy peaks and storybook villages.",
    search: "Swiss Alps",
  },
];

export default function PopularDestinations() {
  return (
    <section className="section destinations">
      <div className="container">
        <span className="eyebrow">EXPLORE THE WORLD</span>
        <h2 className="section-heading">Popular destinations</h2>
        <p className="section-description">
          A little inspiration for your next extraordinary escape.
        </p>

        <div className="destination-grid">
          {destinations.map((destination) => (
            <Link
              key={destination.name}
              href={`/tours?destination=${encodeURIComponent(
                destination.search
              )}`}
              className="destination-card"
              aria-label={`Discover experiences in ${destination.name}, ${destination.country}`}
            >
              <span className="destination-image">
                <Image
                  src={destination.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 850px) 50vw, 25vw"
                  className="destination-photo"
                />
              </span>
              <span className="destination-info">
                <span className="destination-country">
                  {destination.country}
                </span>
                <strong>{destination.name}</strong>
                <span className="destination-description">
                  {destination.description}
                </span>
                <span className="discover">
                  Discover Experiences <span aria-hidden="true">↗</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
