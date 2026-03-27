"use client";

import { X, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useState } from "react";

interface Props {
  images: string[];
  name: string;
  location: string;
  onClose: () => void;
}

export default function ImageModal({ images, name, location, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-6xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
              <div className="flex items-center text-white/80">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{location}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/30"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Main Image */}
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
          <img
            src={images[currentIndex]}
            alt={`${name} - ${currentIndex + 1}`}
            className="w-full max-h-[70vh] object-contain object-center bg-black"
          />

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/30 group"
              >
                <ChevronLeft className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/30 group"
              >
                <ChevronRight className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-semibold border border-white/30">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 px-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-3 transition-all ${
                  i === currentIndex
                    ? "border-white scale-105 shadow-lg"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
