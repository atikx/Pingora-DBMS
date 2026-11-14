import React, { useCallback, useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";

import img1 from "@/assets/images/img1.jpg";
import img2 from "@/assets/images/img2.jpg";
import img3 from "@/assets/images/img3.jpg";
import { toast } from "sonner";

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // Images array - replace with your image URLs

  const items = [
    {
      id: 1,
      image: img1,
      title: "How to Become a Sigma Boy",
      description:
        "Ah, the joy of the open road—it's a good feeling. But if you're new to driving, you may...",
    },
    {
      id: 2,
      image: img2,
      title: "How to Become a Sigma Boy",
      description:
        "Ah, the joy of the open road—it's a good feeling. But if you're new to driving, you may...",
    },
    {
      id: 3,
      image: img3,
      title: "How to Become a Sigma Boy",
      description:
        "Ah, the joy of the open road—it's a good feeling. But if you're new to driving, you may...",
    },
  ];

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Function to handle dot navigation
  const scrollTo = (index: number) => {
    if (!api) return;
    api.scrollTo(index);
  };

  return (
    <div
      className="sm:w-[70%]  w-[25rem]  transition duration-500 hover:scale-105 "
      onClick={() => {
        toast.error("comming soon see the posts below");
      }}
    >
      <Carousel
        setApi={setApi}
        plugins={[Autoplay({ delay: 3000 })]}
        opts={{ loop: true, align: "center" }}
        className=""
      >
        <CarouselContent className="">
          {items.map((item, index) => (
            <CarouselItem key={index} className="">
              <div className="relative cursor-pointer  ">
                <div className="relative flex justify-center items-center  overflow-hidden rounded-lg">
                  <img
                    src={item.image}
                    alt={`Slide ${index + 1}`}
                    className="w-full md:h-[30rem] h-[20rem] object-cover  "
                  />
                </div>

                {/* text */}
                <div className="absolute h-24 bottom-0 right-0 left-0 m-2 rounded-md bg-white/80 backdrop-blur-lg text-black p-4">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Navigation dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: count }).map((_, index) => (
          <Button
            key={index}
            onClick={() => scrollTo(index)}
            size="icon"
            className={`w-2 h-2 rounded-full ${
              current === index ? "bg-primary" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
