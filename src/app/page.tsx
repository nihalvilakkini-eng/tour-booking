
import HeroSection from "@/components/home/HeroSection";
import FeaturedTours from "@/components/home/FeaturedTours";
import PopularDestinations from "@/components/home/PopularDestinations";
import HomeExperienceSections from "@/components/home/HomeExperienceSections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PopularDestinations />
      <FeaturedTours />
      <HomeExperienceSections />
    </>
  );
}
