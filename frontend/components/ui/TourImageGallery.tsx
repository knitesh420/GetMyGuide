// src/components/ui/TourImageGallery.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourImageGalleryProps {
  images: string[];
  title: string;
}

export function TourImageGallery({ images = [], title }: TourImageGalleryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- FIX #1: Use useMemo for stable derivation of unique images ---
  const uniqueImages = useMemo(() => (images?.length ? [...new Set(images)] : []), [images]);

  // --- FIX #2: More robust state handling ---
  // State for user-clicked image. If null, we default to the first image.
  const [userSelectedImage, setUserSelectedImage] = useState<string | null>(null);

  // The image to display is either the one the user clicked or the first in the list.
  // This is derived on every render, so it's never stale and prevents flickering.
  const selectedImage = userSelectedImage || uniqueImages[0] || null;

  // If the list of images changes (e.g., navigating to a new tour),
  // reset the user's selection to default back to the first image.
  useEffect(() => {
    setUserSelectedImage(null);
  }, [uniqueImages]);

  // --- MODAL FOR FULL-SCREEN GALLERY ---
  const renderModal = () => (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col p-4 animate-fade-in-up">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsModalOpen(false)}
          className="text-white hover:text-white hover:bg-white/10"
        >
          <X className="w-8 h-8" />
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-white text-center mb-4">{title}</h2>
          {uniqueImages.map((src, index) => (
            <div key={index} className="relative aspect-video w-full">
              <Image src={src} alt={`${title} - ${index + 1}`} fill className="object-contain" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // --- RENDER LOGIC ---

  // If after all checks there's no image to display, show a placeholder.
  if (!selectedImage) {
    return (
      <div className="aspect-[16/9] w-full rounded-xl bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  // If there's only one unique image, render a simplified, large image viewer.
  if (uniqueImages.length === 1) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={selectedImage}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      </div>
    );
  }

  // If there are multiple images, render the interactive gallery.
  return (
    <section>
      <div className="flex flex-col-reverse md:flex-row gap-4 h-auto md:h-[450px] lg:h-[550px]">
        {/* Thumbnails Column */}
        <div className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:w-[120px] flex-shrink-0 pr-2">
          {uniqueImages.map((src, index) => (
            <div
              key={index}
              className={cn(
                "relative aspect-square w-20 h-20 md:w-full md:h-auto flex-shrink-0 cursor-pointer rounded-lg overflow-hidden transition-all duration-200",
                selectedImage === src
                  ? "ring-2 ring-primary ring-offset-2"
                  : "opacity-60 hover:opacity-100"
              )}
              onClick={() => setUserSelectedImage(src)}
            >
              <Image
                src={src}
                alt={`${title} thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Main Image Display */}
        <div className="relative h-full flex-1 rounded-xl overflow-hidden">
          <Image
            src={selectedImage}
            alt={title}
            fill
            className="object-cover cursor-pointer"
            onClick={() => setIsModalOpen(true)}
            priority
          />
          <div className="absolute bottom-4 right-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              View All Photos
            </Button>
          </div>
        </div>
      </div>

      {isModalOpen && renderModal()}
    </section>
  );
}