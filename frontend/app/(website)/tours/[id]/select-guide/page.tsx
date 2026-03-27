"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, notFound, useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import { GuideCard } from "@/components/GuideCard";
import HeroSection from "@/components/all/CommonHeroSection";
import { XCircle } from "lucide-react";
import { RootState, AppDispatch } from "@/lib/store";
import { fetchPackages } from "@/lib/redux/thunks/admin/packageThunks";
import { fetchGuidesForTour } from "@/lib/redux/thunks/guide/guideThunk"; // ✅ Use the new thunk
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const GuideCardSkeleton = () => (
    <Card className="animate-pulse">
        <div className="w-full h-56 bg-gray-300 rounded-t-lg"></div>
        <div className="p-4 space-y-3">
            <div className="h-6 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="flex justify-between items-center pt-2">
                <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                <div className="h-10 bg-gray-300 rounded w-1/4"></div>
            </div>
        </div>
    </Card>
);

function GuideSelectionContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const dispatch = useDispatch<AppDispatch>();

    const [selectedLanguage, setSelectedLanguage] = useState("all");

    const tourId = Array.isArray(params.id) ? params.id[0] : params.id;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const numberOfTourists = searchParams.get("tourists");

    const { items: packages, loading: packagesLoading } = useSelector(
        (state: RootState) => state.packages
    );
    const {
        guides,
        loading: guidesLoading,
        error,
    } = useSelector((state: RootState) => state.guide);

    const tour = packages.find((t) => t._id === tourId);

    // ✅ EFFECT 1: Fetch guides based on tour, dates, and language
    useEffect(() => {
        if (tourId && startDate && endDate) {
            dispatch(fetchGuidesForTour({
                tourId,
                startDate,
                endDate,
                language: selectedLanguage,
            }));
        }
    }, [dispatch, tourId, startDate, endDate, selectedLanguage]); // Re-fetches when language filter changes

    // ✅ EFFECT 2: Fetch all packages if the store is empty (for direct navigation)
    useEffect(() => {
        if (packages.length === 0 && packagesLoading !== 'pending') {
            dispatch(fetchPackages());
        }
    }, [dispatch, packages.length, packagesLoading]);

    // ✅ SIMPLIFIED: Unique languages are derived from the already-filtered guides
    const uniqueLanguages = useMemo(() => {
        const languages = new Set<string>();
        guides.forEach((guide) => {
            guide.languages?.forEach((lang) => languages.add(lang));
        });
        return ["all", ...Array.from(languages)];
    }, [guides]);

    // ✅ SIMPLIFIED: `availableGuides` is now just the list from the Redux state,
    // as all filtering is performed by the backend.
    const availableGuides = guides;
    
    // --- RENDER LOGIC ---

    if (guidesLoading) {
        return (
            <div className="container max-w-7xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.from({ length: 3 }).map((_, i) => <GuideCardSkeleton key={i} />)}
                </div>
            </div>
        );
    }
    
    if (!startDate || !endDate || !numberOfTourists) {
        notFound();
    }
    
    if (packagesLoading === "succeeded" && !tour) {
        notFound();
    }
    
    if (!tour) {
        return ( // Graceful loading state for the tour info itself
            <div className="flex justify-center items-center h-screen">
                <div className="text-xl font-bold">Loading tour information...</div>
            </div>
        );
    }

    const formattedStartDate = new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const formattedEndDate = new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });

    return (
        <main>
            <HeroSection
                badgeText={`For ${numberOfTourists} Guest(s) from ${formattedStartDate} - ${formattedEndDate}`}
                title="Available Local Guides"
                description={`Here are the expert guides available for your ${tour.title} tour.`}
                backgroundImage="/3.jpg"
            />

            <section className="py-6 bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
                <div className="container max-w-7xl mx-auto px-4 flex justify-center">
                    <div className="w-full md:w-72">
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                            <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder="Filter by Language" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueLanguages.map((lang) => (
                                    <SelectItem key={lang} value={lang} className="capitalize">
                                        {lang === "all" ? "All Languages" : lang}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-24">
                <div className="container max-w-7xl mx-auto px-4">
                    {availableGuides.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {availableGuides.map((guide, index) => {
                                const checkoutHref = `/checkout?tourId=${tourId}&guideId=${guide._id}&startDate=${startDate}&endDate=${endDate}&tourists=${numberOfTourists}`;
                                return (
                                    <div
                                        key={guide._id}
                                        className="animate-fade-in-up"
                                        style={{
                                            animationDelay: `${index * 100}ms`,
                                            animationFillMode: "forwards",
                                            opacity: 0,
                                        }}
                                    >
                                        <GuideCard guide={guide} checkoutHref={checkoutHref} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 max-w-lg mx-auto">
                            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
                            <h2 className="text-3xl font-bold mb-2">No Guides Available</h2>
                            <p className="text-muted-foreground text-lg">
                                Unfortunately, no guides are available that match your criteria.
                                Please go back and try a different date or language.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default function SelectGuidePage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense
                fallback={
                    <div className="flex justify-center items-center h-screen font-bold text-xl">
                        Loading available guides...
                    </div>
                }
            >
                <GuideSelectionContent />
            </Suspense>
        </div>
    );
}