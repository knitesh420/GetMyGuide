"use client";
import { useState, useEffect } from "react";
import ImageModal from "./ImageModal";
import { MapPin } from "lucide-react";

interface Props {
  title: string;
  city: string;
  images: (File | string)[];
  places?: string[];
}

export default function TourCard({ title, city, images, places }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!images || images.length === 0) {
      setImageUrls([]);
      return;
    }

    // If images are already string URLs (e.g. remote paths), use them directly
    if (typeof images[0] === "string") {
      setImageUrls(images as string[]);
      return;
    }

    // Otherwise assume File objects and create object URLs
    const files = images as File[];
    const urls = files.map((file) => URL.createObjectURL(file));
    setImageUrls(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="group relative">
        <div className="w-72 h-72 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 p-1 shadow-xl">
          <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-200 mb-4 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Rectangular Card */}
        <div className="w-70 h-70 rounded-lg overflow-hidden shadow-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-3xl border-4 border-white">
          {/* Background Image */}
          <div
            className="w-full h-full relative bg-cover bg-center transition-transform duration-700"
            style={{
              backgroundImage: `url(${imageUrls[0] || ""})`,
              transform: isHovered ? "scale(1.1)" : "scale(1)",
            }}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
              {/* Package Title */}
              <h3 className="text-2xl font-bold mb-2 leading-tight drop-shadow-lg text-center mx-auto">
                {title}
              </h3>

              {/* View More Button */}
              <button
                onClick={() => setShowModal(true)}
                className="mx-auto px-3 py-1 bg-white/20 backdrop-blur-md border-2 border-white/50 rounded-full text-white font-semibold text-xs hover:bg-white/30 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                View More
              </button>
            </div>

            {/* Image Count Badge */}
            {/* {imageUrls.length > 1 && (
              <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-slate-800 text-xs font-bold shadow-lg border-2 border-white">
                +{imageUrls.length - 1} more
              </div>
            )} */}
          </div>
        </div>
      </div>

      {showModal && (
        <ImageModal
          images={imageUrls}
          name={title}
          location={city}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
