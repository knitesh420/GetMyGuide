"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageModal from "./ImageModal";
import { MapPin, IndianRupee, Users, Calendar, Eye, ArrowRight } from "lucide-react";

interface Props {
  id?: string;
  title: string;
  city: string;
  images: (File | string)[];
  places?: string[];
  price?: number;
  shortDescription?: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
  numberOfPeople?: number;
  numberOfDays?: number;
}

export default function TourCard({
  id,
  title,
  city,
  images,
  places,
  price,
  shortDescription,
  numberOfPeople,
  numberOfDays,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    if (!images || images.length === 0) {
      setImageUrls([]);
      setHasImageError(false);
      return;
    }

    if (typeof images[0] === "string") {
      setImageUrls(images as string[]);
      setHasImageError(false);
      return;
    }

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
        <div className="rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">{title}</h3>
          <p className="text-sm text-slate-500">{city}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="group rounded-2xl bg-white shadow-lg hover:shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col h-full"
        onClick={() => setShowModal(true)}
      >
        {/* Image Section */}
        <div className="relative h-52 overflow-hidden shrink-0">
          {imageUrls[0] && !hasImageError ? (
            <img
              src={imageUrls[0]}
              alt={title}
              onError={() => setHasImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-slate-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

          {/* Price Badge */}
          {price !== undefined && price > 0 && (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
              <span className="flex items-center text-sm font-bold text-orange-600">
                <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                {price.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Image Count Badge */}
          {imageUrls.length > 1 && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <span className="text-white text-xs font-medium">
                {imageUrls.length} photos
              </span>
            </div>
          )}

          {/* City on image */}
          <div className="absolute bottom-3 left-3 flex items-center text-white">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium drop-shadow-md">{city}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col grow">
          {/* Title */}
          <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
            {title}
          </h3>

          {/* Short Description */}
          {shortDescription && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">
              {shortDescription}
            </p>
          )}

          {/* Meta Info Row */}
          {(numberOfDays || numberOfPeople) && (
            <div className="flex items-center gap-4 mb-3">
              {numberOfDays && (
                <div className="flex items-center text-slate-600">
                  <Calendar className="w-4 h-4 mr-1.5 text-orange-500" />
                  <span className="text-sm font-medium">
                    {numberOfDays} {numberOfDays === 1 ? "Day" : "Days"}
                  </span>
                </div>
              )}
              {numberOfPeople && (
                <div className="flex items-center text-slate-600">
                  <Users className="w-4 h-4 mr-1.5 text-orange-500" />
                  <span className="text-sm font-medium">
                    Up to {numberOfPeople}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Places Tags */}
          {places && places.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {places.slice(0, 3).map((place, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full"
                >
                  {place}
                </span>
              ))}
              {places.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                  +{places.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Divider + View Button - pushed to bottom */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
            {price !== undefined && price > 0 ? (
              <div>
                <span className="text-xs text-slate-400 block">
                  Starting from
                </span>
                <span className="flex items-center text-lg font-bold text-slate-800">
                  <IndianRupee className="w-4 h-4" />
                  {price.toLocaleString("en-IN")}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-400">Contact for price</span>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-full transition-all"
              >
                <Eye className="w-4 h-4" />
                Photos
              </button>
              {id && (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/tours/${id}`); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold rounded-full hover:from-orange-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ImageModal
          images={imageUrls}
          name={title}
          location={city}
          places={places}
          price={price}
          shortDescription={shortDescription}
          numberOfPeople={numberOfPeople}
          numberOfDays={numberOfDays}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
