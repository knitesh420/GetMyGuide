import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import {
  fetchAdvertisements,
  clearError,
} from "@/lib/redux/advertisementSlice";
import { Advertisement } from "@/lib/service/advertisementService";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PRODUCTION_API_URL = "https://api.getmyguide.in";

interface AdvertisementDisplayProps {
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

const AdvertisementDisplay: React.FC<AdvertisementDisplayProps> = ({
  className = "",
  autoplay = true,
  muted = true,
  loop = true,
  controls = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { advertisements, loading, error } = useSelector(
    (state: RootState) => state.advertisement,
  );
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [useProductionUrl, setUseProductionUrl] = useState(false);

  useEffect(() => {
    dispatch(fetchAdvertisements());
  }, [dispatch]);

  useEffect(() => {
    if (advertisements.length === 0) return;

    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, 5000); // Change video every 5 seconds

    return () => clearInterval(timer);
  }, [advertisements]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 ${className}`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 ${className}`}
      >
        <div className="text-center p-4">
          <p className="text-red-600 font-semibold">
            Could not load advertisements
          </p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(clearError())}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (advertisements.length === 0) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];
  const baseUrl = useProductionUrl ? PRODUCTION_API_URL : API_URL;
  const videoUrl = `${baseUrl}/media/advertisements/${currentAd.videoFilename}`;

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <video
        key={currentAd.id + (useProductionUrl ? "-prod" : "")}
        src={videoUrl}
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
        controls={controls}
        className="w-full h-full object-cover"
        onError={() => {
          if (!useProductionUrl && API_URL !== PRODUCTION_API_URL) {
            setUseProductionUrl(true);
          }
        }}
      />

      {/* Advertisement indicators */}
      {advertisements.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {advertisements.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentAdIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentAdIndex
                  ? "bg-white w-6"
                  : "bg-white/50 w-2 hover:bg-white/75"
              }`}
              aria-label={`Go to advertisement ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertisementDisplay;
