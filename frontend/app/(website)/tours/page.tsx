"use client";

import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TourCard } from "@/components/TourCard";
import HeroSection from "@/components/all/CommonHeroSection";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { RootState, AppDispatch } from "@/lib/store";
import { fetchPackages } from "@/lib/redux/thunks/admin/packageThunks";
import { fetchAdminLocations } from "@/lib/redux/thunks/admin/locationThunks";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext"; // LanguageContext import karein

// A skeleton component to show while loading
const TourCardSkeleton = () => (
  <Card className="animate-pulse">
    <div className="w-full h-48 bg-gray-300 rounded-t-lg"></div>
    <div className="p-4 space-y-3">
      <div className="h-6 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-8 bg-gray-300 rounded w-1/3"></div>
        <div className="h-10 bg-gray-300 rounded w-1/4"></div>
      </div>
    </div>
  </Card>
);

export default function ToursPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const { t } = useLanguage(); // Language hook ka istemal karein

  const dispatch = useDispatch<AppDispatch>();
  const {
    items: tours,
    loading: toursLoading,
    error: toursError,
  } = useSelector((state: RootState) => state.packages);
  const { locations: adminLocations } = useSelector(
    (state: RootState) => state.admin
  );

  useEffect(() => {
    dispatch(fetchPackages());
    dispatch(fetchAdminLocations());
  }, [dispatch]);

  const locations = useMemo(() => {
    const uniqueLocations = [
      ...new Set(adminLocations.map((loc) => loc.placeName.toLowerCase())),
    ];
    return ["all", ...uniqueLocations];
  }, [adminLocations]);

  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const matchesSearch =
        tour.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tour.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation =
        selectedLocation === "all" ||
        tour.locations.some(
          (loc) => loc.toLowerCase() === selectedLocation.toLowerCase()
        );
      return matchesSearch && matchesLocation;
    });
  }, [tours, searchTerm, selectedLocation]);

  const renderContent = () => {
    if (toursLoading === "pending") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <TourCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (toursError) {
      return (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-2 text-destructive">
            {t("tours_failed_title")}
          </h2>
          <p className="text-muted-foreground">{toursError}</p>
        </div>
      );
    }

    if (filteredTours.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTours.map((tour, index) => (
            <div
              key={tour._id}
              className="animate-fade-in-up"
              style={{
                animationDelay: `${index * 100}ms`,
                opacity: 0,
                animationFillMode: "forwards",
              }}
            >
              <TourCard tour={tour} />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">
          {t("tours_not_found_title")}
        </h2>
        <p className="text-muted-foreground">{t("tours_not_found_desc")}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection
          badgeText={t("tours_badge")}
          title={t("tours_title")}
          description={t("tours_desc")}
          backgroundImage="/3.jpg"
        />

        <section className="sticky top-0 z-20 py-6 bg-background/80 backdrop-blur-lg border-b">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("tours_search_placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger className="w-full md:w-56 h-12 text-base">
                  <SelectValue placeholder={t("tours_filter_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem
                      key={location}
                      value={location}
                      className="capitalize"
                    >
                      {location === "all" ? t("tours_all_locations") : location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-7xl mx-auto px-4">
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  );
}
