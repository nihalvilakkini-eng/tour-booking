"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // Dedicated independent scroll container & group refs for Popular Experiences
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

  // Load experiences from API
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

  // Ensure each group has enough cards (at least 8) to span wide monitors
  const repeatedExperiences = useMemo(() => {
    if (experiences.length === 0) return [];
    if (experiences.length >= 8) return experiences;
    if (experiences.length >= 4) return [...experiences, ...experiences];
    return [...experiences, ...experiences, ...experiences, ...experiences];
  }, [experiences]);

  // Seamless infinite horizontal auto-scrolling loop
  useEffect(() => {
    const container = containerRef.current;
    const group = groupRef.current;
    if (!container || !group || repeatedExperiences.length === 0) return;

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
  }, [repeatedExperiences]);

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
    experience: Experience,
    keyPrefix: string,
    index: number,
    isDuplicate = false
  ) => (
    <Link
      key={`${keyPrefix}-${experience._id || experience.name}-${index}`}
      href="/tours"
      className="destination-card"
      draggable={false}
      tabIndex={isDuplicate ? -1 : 0}
      aria-hidden={isDuplicate ? "true" : undefined}
      aria-label={`Explore ${experience.name}`}
    >
      <span className="destination-image">
        <Image
          src={experience.image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 850px) 50vw, 25vw"
          className="destination-photo pointer-events-none select-none"
          unoptimized
          draggable={false}
        />
      </span>
      <span className="destination-info select-none">
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
  );

  return (
    <section className="section destinations popular-experiences">
      <div className="container">
        <div className="experiences-header-row">
          <div className="experiences-header-text">
            <span className="eyebrow">HANDPICKED FOR YOU</span>
            <h2 className="section-heading">Popular experiences</h2>
            <p className="section-description">
              Thoughtfully curated experiences for your next escape.
            </p>
          </div>

          {!loading && !error && experiences.length > 0 && (
            <div
              className="experiences-nav-controls"
              aria-label="Popular experiences navigation"
            >
              <button
                type="button"
                onClick={() => scrollByArrow("left")}
                aria-label="Previous experiences"
                className="experiences-nav-btn experiences-nav-prev"
                title="Previous experiences"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => scrollByArrow("right")}
                aria-label="Next experiences"
                className="experiences-nav-btn experiences-nav-next"
                title="Next experiences"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

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
          <div
            id="popular-experiences-scroll"
            ref={containerRef}
            className="experiences-scroller scrollbar-none"
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
            aria-label="Popular experiences single-row carousel"
          >
            <div className="experiences-track">
              {/* Primary group */}
              <div className="experiences-group" ref={groupRef}>
                {repeatedExperiences.map((experience, i) =>
                  renderCard(experience, "exp-primary", i, false)
                )}
              </div>
              {/* Duplicate group for seamless infinite looping */}
              <div className="experiences-group" aria-hidden="true">
                {repeatedExperiences.map((experience, i) =>
                  renderCard(experience, "exp-duplicate", i, true)
                )}
              </div>
            </div>
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
