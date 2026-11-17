"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Destination = {
  _id?: string;
  name: string;
  country: string;
  state?: string;
  city?: string;
  description: string;
  image: string;
  search?: string;
  order?: number;
};

const fallbackDestinations: Destination[] = [
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
  const [destinations, setDestinations] =
    useState<Destination[]>(fallbackDestinations);

  // Dedicated independent scroll container & group refs for Popular Destinations
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  // Auto-scroll and interaction tracking states
  const isPausedRef = useRef(false);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const scrollPosRef = useRef(0);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load destinations from API
  useEffect(() => {
    let cancelled = false;

    async function loadDestinations() {
      try {
        const response = await fetch("/api/destinations", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const result = await response.json();
        const data = Array.isArray(result.data) ? result.data : [];

        if (!cancelled && data.length > 0) {
          setDestinations(data);
        }
      } catch {
        // Keep built-in destination cards if API is unavailable
      }
    }

    void loadDestinations();

    return () => {
      cancelled = true;
    };
  }, []);

  // Ensure each group has enough cards (at least 8) to span wide monitors
  const repeatedDestinations = useMemo(() => {
    if (destinations.length === 0) return [];
    if (destinations.length >= 8) return destinations;
    if (destinations.length >= 4) return [...destinations, ...destinations];
    return [...destinations, ...destinations, ...destinations, ...destinations];
  }, [destinations]);

  // Seamless infinite horizontal auto-scrolling loop
  useEffect(() => {
    const container = containerRef.current;
    const group = groupRef.current;
    if (!container || !group || repeatedDestinations.length === 0) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const speed = 0.75; // Smooth cinematic scroll speed (~45px/sec at 60fps)
    let animationFrameId: number;

    const tick = () => {
      const currentContainer = containerRef.current;
      const currentGroup = groupRef.current;

      if (currentContainer && currentGroup) {
        const groupWidth = currentGroup.offsetWidth;

        if (groupWidth > 0) {
          if (!isPausedRef.current) {
            scrollPosRef.current += speed;

            if (scrollPosRef.current >= groupWidth) {
              scrollPosRef.current -= groupWidth;
            }
            currentContainer.scrollLeft = scrollPosRef.current;
          } else {
            // Keep scroll position synchronized during manual interactions
            scrollPosRef.current = currentContainer.scrollLeft;
            if (scrollPosRef.current >= groupWidth) {
              scrollPosRef.current -= groupWidth;
              currentContainer.scrollLeft = scrollPosRef.current;
            } else if (scrollPosRef.current <= 0) {
              scrollPosRef.current += groupWidth;
              currentContainer.scrollLeft = scrollPosRef.current;
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [repeatedDestinations]);

  // Hover handlers: pause auto-scrolling on hover, resume on leave
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    isPausedRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    isDraggingRef.current = false;
    isPausedRef.current = false;
  };

  // Mouse drag handlers for manual horizontal scrolling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    isPausedRef.current = true;
    startXRef.current = e.pageX;
    scrollStartRef.current = container.scrollLeft;
    hasDraggedRef.current = false;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const container = containerRef.current;
    const group = groupRef.current;
    if (!container) return;

    const dx = e.pageX - startXRef.current;
    if (Math.abs(dx) > 4) {
      hasDraggedRef.current = true;
      let target = scrollStartRef.current - dx;
      if (group && group.offsetWidth > 0) {
        if (target >= group.offsetWidth) target -= group.offsetWidth;
        if (target < 0) target += group.offsetWidth;
      }
      container.scrollLeft = target;
      scrollPosRef.current = target;
    }
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (!isHoveredRef.current && !isDraggingRef.current) {
        isPausedRef.current = false;
      }
    }, 1200);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  };

  // Touch handlers for mobile / tablet swipe scrolling
  const handleTouchStart = () => {
    isPausedRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };

  const handleTouchEnd = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (!isHoveredRef.current && !isDraggingRef.current) {
        isPausedRef.current = false;
      }
    }, 1500);
  };

  // Trackpad / Wheel listener to pause during manual scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = () => {
      isPausedRef.current = true;
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        if (!isHoveredRef.current && !isDraggingRef.current) {
          isPausedRef.current = false;
        }
      }, 1500);
    };

    container.addEventListener("wheel", onWheel, { passive: true });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  // Smooth scroll using arrow buttons
  const scrollByArrow = (direction: "left" | "right") => {
    const container = containerRef.current;
    const group = groupRef.current;
    if (!container || !group) return;

    const groupWidth = group.offsetWidth;
    const amount = Math.min(680, container.clientWidth * 0.75);
    const delta = direction === "left" ? -amount : amount;

    isPausedRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (!isHoveredRef.current && !isDraggingRef.current) {
        isPausedRef.current = false;
      }
    }, 2000);

    let target = container.scrollLeft + delta;
    if (groupWidth > 0) {
      if (target >= groupWidth) target -= groupWidth;
      if (target < 0) target += groupWidth;
    }

    container.scrollTo({
      left: target,
      behavior: "smooth",
    });
    scrollPosRef.current = target;
  };

  const renderCard = (
    destination: Destination,
    keyPrefix: string,
    index: number,
    isDuplicate = false
  ) => (
    <Link
      key={`${keyPrefix}-${destination._id || destination.name}-${index}`}
      href={
        destination._id
          ? `/destinations/${destination._id}`
          : `/destinations/${encodeURIComponent(
              destination.search || destination.name
            )}`
      }
      className="destination-card"
      draggable={false}
      tabIndex={isDuplicate ? -1 : 0}
      aria-hidden={isDuplicate ? "true" : undefined}
      aria-label={`Discover experiences in ${destination.name}, ${destination.country}`}
    >
      <span className="destination-image">
        <Image
          src={destination.image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 850px) 50vw, 25vw"
          className="destination-photo pointer-events-none select-none"
          unoptimized
          draggable={false}
        />
      </span>
      <span className="destination-info select-none">
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
  );

  return (
    <section className="section destinations popular-destinations">
      <div className="container">
        <div className="destinations-header-row">
          <div className="destinations-header-text">
            <span className="eyebrow">EXPLORE THE WORLD</span>
            <h2 className="section-heading">Popular destinations</h2>
            <p className="section-description">
              A little inspiration for your next extraordinary escape.
            </p>
          </div>

          <div
            className="destinations-nav-controls"
            aria-label="Popular destinations navigation"
          >
            <button
              type="button"
              onClick={() => scrollByArrow("left")}
              aria-label="Previous destinations"
              className="destinations-nav-btn destinations-nav-prev"
              title="Previous destinations"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => scrollByArrow("right")}
              aria-label="Next destinations"
              className="destinations-nav-btn destinations-nav-next"
              title="Next destinations"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          id="popular-destinations-scroll"
          ref={containerRef}
          className="destinations-scroller scrollbar-none"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClickCapture={handleClickCapture}
          tabIndex={0}
          role="region"
          aria-label="Popular destinations single-row carousel"
        >
          <div className="destinations-track">
            {/* Primary group */}
            <div className="destinations-group" ref={groupRef}>
              {repeatedDestinations.map((destination, i) =>
                renderCard(destination, "dest-primary", i, false)
              )}
            </div>
            {/* Duplicate group for seamless infinite looping */}
            <div className="destinations-group" aria-hidden="true">
              {repeatedDestinations.map((destination, i) =>
                renderCard(destination, "dest-duplicate", i, true)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
