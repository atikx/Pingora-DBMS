import { toast } from "sonner";

interface HeroCardProps {
  title: string;
  description: string;
  imageUrl: string;
}

export function HeroCard({ title, description, imageUrl }: HeroCardProps) {
  return (
    <div
      className="relative transition duration-500 hover:scale-105 cursor-pointer overflow-hidden rounded-xl shadow-xl md:h-[30rem] md:w-[30rem] h-[25rem] w-[25rem]"
      onClick={() => {
        toast.error("comming soon see the posts below");
      }}
    >
      {/* Background Image */}
      <img src={imageUrl} alt={title} className="h-full w-full object-cover" />

      {/* Glassmorphism Overlay */}
      <div
        className="absolute bottom-0 h-24 right-0 left-0 m-2 rounded-md
         bg-white/80 backdrop-blur-lg text-black p-4"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm mt-1 line-clamp-2">{description}</p>
      </div>
    </div>
  );
}
