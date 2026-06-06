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
import type { TourData } from "@/app/(website)/services/types/tour";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolvePackageImageUrl } from "@/lib/utils";

export function TourCard({ tour }: { tour: TourData }) {
  // --- 2. Create an array of unique image URLs ---
  // The 'Set' automatically removes duplicates. This handles cases where the images array is missing or empty.
  const { language } = useLanguage();
  const uniqueImages = tour.images?.length ? [...new Set(tour.images)] : [];
  const uniqueImagesResolved = uniqueImages.map(resolvePackageImageUrl);

  const translation =
    tour.translations?.[language as keyof typeof tour.translations];
  const title = translation?.title ?? tour.title;
  const city = translation?.city ?? tour.city;
  const places = translation?.places ?? tour.places ?? [];
  const duration = tour.duration;
  const price = tour.price ?? 0;
  const basePrice = tour.basePrice ?? 0;
  const currency = tour.baseCurrency ?? "INR";
  const showSavings = basePrice && basePrice > price;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Link href={`/tours/${tour.id}`} className="block group" prefetch={false}>
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-2 border-border/60">
        {/* --- 3. Replace the single Image div with the Carousel --- */}
        <div className="relative w-full">
          {uniqueImagesResolved.length > 0 ? (
            <Carousel
              opts={{
                loop: uniqueImagesResolved.length > 1, // Enable looping only if there's more than one image
              }}
              className="w-full"
            >
              <CarouselContent>
                {uniqueImagesResolved.map((imageSrc, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={imageSrc || "/placeholder.svg"} // Fallback for null/empty string in array
                        alt={`${title} - Image ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          // In case of an error loading an image, show a placeholder
                          e.currentTarget.src = "/placeholder.svg";
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
            {title}
          </h3>
        </CardHeader>
        <CardContent className="grow space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{places.join(", ")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{duration}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center mt-auto pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="text-2xl font-extrabold text-primary">
              {formatCurrency(price)}
            </p>
          </div>

          {showSavings && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground line-through">
                {formatCurrency(basePrice)}
              </p>
              <p className="text-sm font-bold text-destructive">
                Save {Math.round(((basePrice - price) / basePrice) * 100)}%
              </p>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
