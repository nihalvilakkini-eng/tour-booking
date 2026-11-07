
"use client";

import { useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import FeaturedTours from "@/components/home/FeaturedTours";
import PopularDestinations from "@/components/home/PopularDestinations";
import HomeExperienceSections from "@/components/home/HomeExperienceSections";

export default function HomePage() {
  const [destination, setDestination] = useState("");
  const [activity, setActivity] = useState("");

 function handleSearch(newDestination: string, newActivity: string) {
  setDestination(newDestination);
  setActivity(newActivity);

  setTimeout(() => {
    document.getElementById("tour-results")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
}

  function clearSearch() {
    setDestination("");
    setActivity("");
  }

  const isSearching = Boolean(destination || activity);

  return (
    <>
      <HeroSection
        onSearch={handleSearch}
        onClear={clearSearch}
      />

      <PopularDestinations />

      <FeaturedTours
        destination={destination}
        activity={activity}
        isSearching={isSearching}
      />

      <HomeExperienceSections />
    </>
  );
}
