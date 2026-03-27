"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";

interface Location {
    _id: string;
    placeName: string;
    pricing?: {
        smallGroup: { price: number };
        mediumGroup: { price: number };
        largeGroup: { price: number };
    };
}

interface Language {
    _id: string;
    languageName: string;
}

interface LocationBookingWidgetProps {
    location: Location;
    languages: Language[];
}

export function LocationBookingWidget({ location, languages }: LocationBookingWidgetProps) {
    const router = useRouter();
    const [selectedLanguage, setSelectedLanguage] = useState("");

    const handleFindGuides = () => {
        if (selectedLanguage) {
            router.push(`/find-guides?location=${encodeURIComponent(location.placeName)}&language=${encodeURIComponent(selectedLanguage)}`);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-8 shadow-sm sticky top-24">
            <h3 className="text-xl font-bold mb-6">Find a Guide</h3>

            {/* Language Dropdown */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Language</label>
                <div className="relative">
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none bg-white"
                    >
                        <option value="">Choose a language...</option>
                        {languages.map((lang) => (
                            <option key={lang._id} value={lang.languageName}>
                                {lang.languageName}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <h4 className="text-sm font-medium text-gray-700 mb-3">Estimated Guide Fees</h4>
            {location.pricing ? (
                <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Small Group (1-5)</span>
                        </div>
                        <span className="font-bold text-primary">
                            ₹{location.pricing.smallGroup?.price || "N/A"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Medium Group (6-14)</span>
                        </div>
                        <span className="font-bold text-primary">
                            ₹{location.pricing.mediumGroup?.price || "N/A"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Large Group (15+)</span>
                        </div>
                        <span className="font-bold text-primary">
                            ₹{location.pricing.largeGroup?.price || "N/A"}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-gray-500 mb-8">Pricing information not available.</p>
            )}

            <button
                onClick={handleFindGuides}
                disabled={!selectedLanguage}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                Find Guides <ArrowRight className="w-5 h-5" />
            </button>
            {!selectedLanguage && (
                <p className="text-xs text-center text-gray-500 mt-2">Please select a language to proceed</p>
            )}
        </div>
    );
}
