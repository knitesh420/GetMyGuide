"use client";

import Link from "next/link";
import Image from "next/image";
import { AdminPackage } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RecommendedPackagesSliderProps {
  title: string;
  packages: AdminPackage[];
  loading: boolean;
}

const SliderSkeleton = () => (
    <div className="flex space-x-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="w-full sm:w-[280px] flex-shrink-0">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4 mt-2" />
                <Skeleton className="h-5 w-1/2 mt-1" />
            </div>
        ))}
    </div>
);

export function RecommendedPackagesSlider({ title, packages, loading }: RecommendedPackagesSliderProps) {
  // Don't render anything if loading is done and there are no packages
  if (!loading && packages.length === 0) {
    return null;
  }

  // Duplicate the packages array for a seamless loop effect
  const duplicatedPackages = [...packages, ...packages];

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6">{title}</h2>
      <div className="relative w-full overflow-hidden">
        {loading ? (
          <SliderSkeleton />
        ) : (
          <div className="flex animate-marquee hover:[animation-play-state:paused] space-x-6">
            {duplicatedPackages.map((pkg, index) => (
              <Link href={`/tours/${pkg._id}`} key={`${pkg._id}-${index}`} className="block">
                <Card className="w-full sm:w-[300px] flex-shrink-0 group overflow-hidden border-2 border-transparent hover:border-primary transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="relative h-48 w-full">
                      <Image
                        src={pkg.images[0] || "/placeholder.svg"}
                        alt={pkg.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg truncate">{pkg.title}</h3>
                      <p className="text-primary font-semibold mt-1">
                        ₹{pkg.price.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}