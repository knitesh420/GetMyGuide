"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { fetchAdvertisements } from "@/lib/redux/advertisementSlice";
import { getAdvertisementById } from "@/lib/service/advertisementService";

const AD_DISPLAY_DELAY_MS = 3000;
const SESSION_KEY = "gmg_ad_shown";
const MINIMIZED_SIZE = 48;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PRODUCTION_API_URL = "https://api.getmyguide.in";

interface Position {
  x: number;
  y: number;
}

const FloatingVideoAd: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { advertisements } = useSelector(
    (state: RootState) => state.advertisement,
  );

  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [useProductionUrl, setUseProductionUrl] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasInitialized = useRef(false);

  // Fetch ads on mount
  useEffect(() => {
    dispatch(fetchAdvertisements());
  }, [dispatch]);

  // Set initial position (bottom-right corner) and show after delay
  useEffect(() => {
    if (advertisements.length === 0 || hasInitialized.current) return;

    // Check if ad was already shown this session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    hasInitialized.current = true;

    const timer = setTimeout(() => {
      // Position at bottom-right with padding
      const x = window.innerWidth - 340;
      const y = window.innerHeight - 240;
      setPosition({ x: Math.max(16, x), y: Math.max(16, y) });
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, "true");
    }, AD_DISPLAY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [advertisements]);

  // Track impression when video loads
  const handleVideoLoad = useCallback(() => {
    const currentAd = advertisements[currentAdIndex];
    if (currentAd) {
      getAdvertisementById(currentAd.id).catch(() => {});
    }
  }, [advertisements, currentAdIndex]);

  // Rotate ads every 15 seconds
  useEffect(() => {
    if (advertisements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, 15000);

    return () => clearInterval(timer);
  }, [advertisements.length]);

  // --- Drag handlers (mouse + touch) ---

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      setIsDragging(true);
      setDragOffset({
        x: clientX - position.x,
        y: clientY - position.y,
      });
    },
    [position],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !containerRef.current) return;

      const el = containerRef.current;
      const maxX = window.innerWidth - el.offsetWidth;
      const maxY = window.innerHeight - el.offsetHeight;

      setPosition({
        x: Math.min(Math.max(0, clientX - dragOffset.x), maxX),
        y: Math.min(Math.max(0, clientY - dragOffset.y), maxY),
      });
    },
    [isDragging, dragOffset],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart],
  );

  // Touch events
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    },
    [handleDragStart],
  );

  // Global move/end listeners
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) =>
      handleDragMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };
    const onEnd = () => handleDragEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Close the ad completely
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
  }, []);

  // Minimize/restore toggle
  const handleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setMinimized((prev) => !prev);

      // When minimizing, snap to nearest edge
      if (!minimized && containerRef.current) {
        const midX = window.innerWidth / 2;
        setPosition((prev) => ({
          x: prev.x < midX ? 16 : window.innerWidth - MINIMIZED_SIZE - 16,
          y: prev.y,
        }));
      }
    },
    [minimized],
  );

  if (!visible || advertisements.length === 0) return null;

  const currentAd = advertisements[currentAdIndex];
  const baseUrl = useProductionUrl ? PRODUCTION_API_URL : API_URL;
  const videoUrl = `${baseUrl}/media/advertisements/${currentAd.videoFilename}`;

  // Minimized state — small pill icon
  if (minimized) {
    return (
      <div
        ref={containerRef}
        className="fixed z-[9999] cursor-grab active:cursor-grabbing select-none"
        style={{
          left: position.x,
          top: position.y,
          touchAction: "none",
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="flex items-center gap-1 rounded-full bg-black/80 px-3 py-2 shadow-lg backdrop-blur-sm">
          <button
            onClick={handleMinimize}
            className="text-white text-xs font-medium hover:text-blue-300 transition-colors"
            title="Restore ad"
          >
            ▶ Ad
          </button>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-red-400 text-xs ml-1 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Full floating video player
  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] select-none"
      style={{
        left: position.x,
        top: position.y,
        width: 320,
        touchAction: "none",
      }}
    >
      <div className="rounded-xl overflow-hidden shadow-2xl bg-black border border-white/10">
        {/* Drag handle + controls bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-gray-900 to-gray-800 cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <span className="text-white/70 text-[11px] font-medium truncate max-w-[200px]">
            {currentAd.title || "Ad"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMinimize}
              className="text-white/60 hover:text-yellow-400 text-sm transition-colors leading-none"
              title="Minimize"
            >
              −
            </button>
            <button
              onClick={handleClose}
              className="text-white/60 hover:text-red-400 text-sm transition-colors leading-none"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video player */}
        <video
          ref={videoRef}
          key={currentAd.id}
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          controls
          onLoadedData={handleVideoLoad}
          className="w-full aspect-video object-cover"
          onError={() => {
            // If local URL fails, try production URL as fallback
            if (!useProductionUrl && API_URL !== PRODUCTION_API_URL) {
              setUseProductionUrl(true);
            }
          }}
        />

        {/* Ad indicator dots */}
        {advertisements.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 bg-gray-900">
            {advertisements.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAdIndex(index)}
                className={`rounded-full transition-all ${
                  index === currentAdIndex
                    ? "bg-white w-4 h-1.5"
                    : "bg-white/30 w-1.5 h-1.5 hover:bg-white/50"
                }`}
                aria-label={`Go to ad ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingVideoAd;
