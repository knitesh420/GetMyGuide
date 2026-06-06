"use client";

import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  IndianRupee,
  Users,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import ServiceContactForm from "./ServiceContactForm";
import { resolvePackageImageUrl } from "@/lib/utils";

interface Props {
  images: Array<string | { url?: string }>;
  name: string;
  location: string;
  places?: string[];
  price?: number;
  shortDescription?: string;
  numberOfPeople?: number;
  numberOfDays?: number;
  onClose: () => void;
}

export default function ImageModal({
  images,
  name,
  location,
  places,
  price,
  shortDescription,
  numberOfPeople,
  numberOfDays,
  onClose,
}: Props) {
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
        className="relative max-w-6xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/30"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Main Image */}
        <div className="relative bg-slate-900 rounded-t-2xl overflow-hidden shadow-2xl">
          <img
            src={resolvePackageImageUrl(images[currentIndex])}
            alt={`${name} - ${currentIndex + 1}`}
            onError={(event) => {
              const target = event.target as HTMLImageElement;
              if (target.src !== "/placeholder.svg") {
                target.src = "/placeholder.svg";
              }
            }}
            className="w-full max-h-[55vh] object-contain object-center bg-black"
          />

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/30 group"
              >
                <ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/30 group"
              >
                <ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-semibold border border-white/30">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Details Panel */}
        <div className="bg-white rounded-b-2xl p-6">
          {/* Title & Location Row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{name}</h2>
              <div className="flex items-center text-slate-500 mt-1">
                <MapPin className="w-4 h-4 mr-1 text-orange-500" />
                <span className="text-sm">{location}</span>
              </div>
            </div>
            {price !== undefined && price > 0 && (
              <div className="flex-shrink-0 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl text-center">
                <span className="text-xs text-orange-500 block">
                  Starting from
                </span>
                <span className="flex items-center justify-center text-xl font-bold text-orange-600">
                  <IndianRupee className="w-4.5 h-4.5" />
                  {price.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          {/* Short Description */}
          {/* {shortDescription && (
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {shortDescription}
            </p>
          )} */}
          <div className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap break-words">
            {shortDescription}
          </div>
          {/* Meta Chips */}
          {(numberOfDays || numberOfPeople) && (
            <div className="flex flex-wrap gap-3 mb-4">
              {numberOfDays && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">
                    {numberOfDays} {numberOfDays === 1 ? "Day" : "Days"}
                  </span>
                </div>
              )}
              {numberOfPeople && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">
                    Up to {numberOfPeople}{" "}
                    {numberOfPeople === 1 ? "Person" : "People"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Places */}
          {places && places.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Places Covered
              </h4>
              <div className="flex flex-wrap gap-2">
                {places.map((place, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 text-sm font-medium rounded-full border border-orange-200"
                  >
                    <MapPin className="w-3 h-3" />
                    {place}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact Form */}
          <div className="mt-5 pt-5 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Interested? Get in Touch
            </h4>
            <ServiceContactForm serviceName={name} />
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 px-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  i === currentIndex
                    ? "border-white scale-105 shadow-lg"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={resolvePackageImageUrl(img)}
                  alt={`Thumbnail ${i + 1}`}
                  onError={(event) => {
                    const target = event.target as HTMLImageElement;
                    if (target.src !== "/placeholder.svg") {
                      target.src = "/placeholder.svg";
                    }
                  }}
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
