import { HeroCard } from "./sections/HeroCard";
import { HeroCarousel } from "./sections/HeroCarousel";

import img4 from "@/assets/images/img4.jpg";
import img5 from "@/assets/images/img5.jpg";

export default function Hero() {
  return (
    <div className="flex flex-col-reverse lg:flex-row items-center lg:items-start justify-center gap-8">
        <HeroCard
          title="How to Become a Sigma Boy"
          description="Ah, the joy of the open road-it's a good feeling. But if you're new to driving, you may..."
          imageUrl={img4}
        />
        <HeroCard
          title="How to Become a Sigma Boy"
          description="Ah, the joy of the open road-it's a good feeling. But if you're new to driving, you may..."
          imageUrl={img5}
        />
        <HeroCarousel />
      </div>

  )
}