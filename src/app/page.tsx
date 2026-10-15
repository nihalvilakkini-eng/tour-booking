
import HeroSection from "@/components/home/HeroSection";
import FeaturedTours from "@/components/home/FeaturedTours";
import PopularDestinations from "@/components/home/PopularDestinations";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PopularDestinations />
      <FeaturedTours />
    </>
  );
}
