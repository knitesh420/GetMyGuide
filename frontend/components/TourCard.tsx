"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // --- 1. Import Carousel components
import { MapPin, Clock } from "lucide-react";
import type { AdminPackage } from "@/types/admin";

export function TourCard({ tour }: { tour: AdminPackage }) {
  // --- 2. Create an array of unique image URLs ---
  // The 'Set' automatically removes duplicates. This handles cases where the images array is missing or empty.
  const uniqueImages = tour.images?.length ? [...new Set(tour.images)] : [];

  const showSavings = tour.basePrice && tour.basePrice > tour.price;

  return (
    <Link href={`/tours/${tour._id}`} className="block group" prefetch={false}>
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-2 border-border/60">
        
        {/* --- 3. Replace the single Image div with the Carousel --- */}
        <div className="relative w-full">
          {uniqueImages.length > 0 ? (
            <Carousel
              opts={{
                loop: uniqueImages.length > 1, // Enable looping only if there's more than one image
              }}
              className="w-full"
            >
              <CarouselContent>
                {uniqueImages.map((imageSrc, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={imageSrc || "/placeholder.svg"} // Fallback for null/empty string in array
                        alt={`${tour.title} - Image ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          // In case of an error loading an image, show a placeholder
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {/* --- 4. Conditionally render controls only if there is more than one image --- */}
            </Carousel>
          ) : (
            // --- 5. Show a placeholder if no images are available ---
            <div className="aspect-video bg-muted flex items-center justify-center">
              <span className="text-sm text-muted-foreground">No Image</span>
            </div>
          )}
        </div>

        <CardHeader>
          <h3 className="text-xl font-bold text-foreground line-clamp-2">
            {tour.title}
          </h3>
        </CardHeader>
        <CardContent className="flex-grow space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{tour.locations.join(", ")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{tour.duration}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center mt-auto pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="text-2xl font-extrabold text-primary">
              ₹{tour.price.toLocaleString()}
            </p>
          </div>

          {showSavings && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground line-through">
                ₹{tour.basePrice.toLocaleString()}
              </p>
              <p className="text-sm font-bold text-destructive">
                Save{" "}
                {Math.round(
                  ((tour.basePrice - tour.price) / tour.basePrice) * 100
                )}
                %
              </p>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}