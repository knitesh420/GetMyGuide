// app/tours/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, CheckCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Redux Imports ---
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { fetchPackages } from "@/lib/redux/thunks/admin/packageThunks";
import { AdminPackage } from "@/types/admin";

// ✅ Import BOTH thunks now
import { fetchPackageById, fetchRecommendedPackages } from "@/lib/redux/thunks/admin/packageThunks";

// ✅ Import the new slider component
import { RecommendedPackagesSlider } from "@/components/RecommendedPackagesSlider";
import { TourImageGallery } from "@/components/ui/TourImageGallery";

// Skeleton Component for Loading State
const TourDetailSkeleton = () => (
  <div className="container max-w-7xl mx-auto px-4 py-12 animate-pulse">
    {/* Title Skeleton */}
    <div className="mb-8">
      <div className="h-12 bg-gray-300 rounded w-3/4 mb-4"></div>
      <div className="flex items-center gap-6">
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
      </div>
    </div>

    {/* Image Gallery Skeleton */}
    <div className="grid grid-cols-4 grid-rows-2 gap-4 mb-12 h-[60vh]">
      <div className="col-span-4 md:col-span-2 row-span-2 bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
    </div>

    {/* Main Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12">
      <div className="lg:col-span-2">
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-5 bg-gray-300 rounded"></div>
          <div className="h-5 bg-gray-300 rounded"></div>
          <div className="h-5 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>
      <aside className="lg:col-span-1">
        <div className="p-6 bg-gray-200 rounded-xl">
          <div className="h-10 bg-gray-300 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-6 bg-gray-300 rounded w-3/4 mx-auto mb-6"></div>
          <div className="h-12 bg-gray-300 rounded w-full mb-6"></div>
          <div className="h-64 bg-gray-300 rounded w-full mb-6"></div>
          <div className="h-14 bg-gray-400 rounded w-full"></div>
        </div>
      </aside>
    </div>
  </div>
);

export default function TourDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // --- Fetch data from Redux store ---
  const {
    items: packages,
    recommended,
    loading,
    error,
  } = useSelector((state: RootState) => state.packages);
  const tour = packages.find((p) => p._id === params.id);

  const [range, setRange] = useState<DateRange | undefined>();
  const [numberOfTourists, setNumberOfTourists] = useState(1);
  useEffect(() => {
    // For efficiency, it's better to fetch only the specific package for this page.
    // fetchPackageById handles adding it to the 'items' list.
    dispatch(fetchPackageById(params.id));
    
    // Fetch the list of recommended packages
    dispatch(fetchRecommendedPackages({ limit: 8 })); // Fetch more items for a better slider look
  }, [dispatch, params.id]);

  useEffect(() => {
    // Fetch packages if they are not already in the store
    // This handles direct navigation to this page
    if (packages.length === 0) {
      dispatch(fetchPackages());
    }
  }, [dispatch, packages.length]);

  // --- Loading State ---
  if (loading === "pending" || (loading === "idle" && packages.length === 0)) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <TourDetailSkeleton />
      </div>
    );
  }

  // --- Not Found State ---
  // This check runs AFTER loading is finished
  if (loading === "succeeded" && !tour) {
    notFound();
  }
  
  // This is a guard against accessing tour properties before it's found
  if (!tour) {
    return null; // Or another loading/error state
  }

  // --- Parse duration safely ---
  const tourDurationDays = parseInt(tour.duration.split(" ")[0]) || 1;

  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    if (selectedRange?.from) {
      const startDate = selectedRange.from;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + tourDurationDays - 1);
      setRange({ from: startDate, to: endDate });
    } else {
      setRange(undefined);
    }
  };

  const handleFindGuides = () => {
    if (range?.from && range.to) {
      // Helper function to format a Date object to a YYYY-MM-DD string
      // in the local timezone, avoiding the UTC conversion issue.
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        // getMonth() is zero-based, so we add 1
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDate = formatDate(range.from);
      const endDate = formatDate(range.to);

      const findGuidesHref = `/tours/${
        tour._id
      }/select-guide?startDate=${startDate}&endDate=${endDate}&tourists=${numberOfTourists}`;
      
      router.push(findGuidesHref);
    }
  };

  const showSavings = tour.basePrice && tour.basePrice > tour.price;

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Title Section */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-2">
            {tour.title}
          </h1>
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />{" "}
              {tour.locations.join(", ")}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> {tour.duration}
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="my-8">
        <TourImageGallery images={tour.images} title={tour.title} />
      </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12">
          <div className="lg:col-span-2">
            <div className="animate-slide-in-left">
              <h2 className="text-3xl font-bold border-b pb-4 mb-4">
                Tour Overview
              </h2>
              <p className="text-lg text-foreground/80 leading-loose">
                {tour.description}
              </p>
            </div>

            <div className="mt-12 animate-slide-in-left animate-delay-200">
              <h2 className="text-3xl font-bold border-b pb-4 mb-4">
                What's Included
              </h2>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" /> Expert Local
                  Guides
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" /> All
                  Accommodations
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" /> Private
                  Transportation
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" /> Entrance
                  Fees to Monuments
                </li>
              </ul>
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 p-6 bg-card rounded-xl shadow-lg border animate-slide-in-right animate-delay-200">
              <div className="text-center mb-1">
                {/* Use 'price' from AdminPackage */}
                <span className="text-4xl font-extrabold text-primary">
                  ₹{(tour.price * numberOfTourists).toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground">/ total</span>
              </div>
              {showSavings && (
                <p className="text-muted-foreground mb-4 text-center">
                  {/* Use 'basePrice' from AdminPackage */}
                  <span className="line-through">
                    ₹{(tour.basePrice * numberOfTourists).toLocaleString()}
                  </span>
                  <span className="font-bold text-destructive">
                    {" "}
                    Save{" "}
                    {Math.round(
                      ((tour.basePrice - tour.price) / tour.basePrice) * 100
                    )}
                    %
                  </span>
                </p>
              )}

              <div className="my-4">
                <Label
                  htmlFor="numberOfTourists"
                  className="text-lg font-bold text-center mb-2 block"
                >
                  How many people?
                </Label>
                <Input
                  id="numberOfTourists"
                  type="number"
                  value={numberOfTourists}
                  onChange={(e) =>
                    setNumberOfTourists(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="text-center h-12 text-base"
                  min="1"
                />
              </div>

              <div className="my-4">
                <h3 className="text-lg font-bold text-center mb-2">
                  Select Your Tour Start Date
                </h3>
                <p className="text-sm text-center text-muted-foreground mb-2">
                  Duration: {tourDurationDays}{" "}
                  {tourDurationDays > 1 ? "Days" : "Day"}
                </p>
                <div className="flex justify-center rounded-lg border">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={handleDateSelect}
                    numberOfMonths={1}
                    disabled={{ before: new Date() }}
                    className="p-0"
                  />
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-white font-bold"
                disabled={!range?.from}
                onClick={handleFindGuides}
              >
                Find Available Guides
              </Button>

              {/* {range?.from && range.to && (
                <p className="text-center mt-3 text-sm text-green-600">
                  Selected: {range.from.toLocaleDateString()} -{" "}
                  {range.to.toLocaleDateString()}
                </p>
              )} */}
            </div>
          </aside>
        </div>
        <div className="mt-24 border-t pt-16">
            <RecommendedPackagesSlider
                title="You Might Also Like"
                // Filter out the current package from the recommendations
                packages={recommended.filter(p => p._id !== tour._id)}
                loading={loading === 'pending' && recommended.length === 0}
            />
        </div>

      </div>
    </div>
  );
}