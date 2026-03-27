import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Info } from "lucide-react";
import { LocationBookingWidget } from "@/components/location/LocationBookingWidget";

interface Location {
    _id: string;
    placeName: string;
    description: string;
    image: string;
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

async function getLocation(id: string): Promise<Location | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/${id}`, {
            cache: "no-store",
        });

        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        return data.data;
    } catch (error) {
        console.error("Error fetching location:", error);
        return null;
    }
}

async function getLanguages(): Promise<Language[]> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/languages`, {
            cache: "no-store",
        });

        if (!res.ok) {
            return [];
        }

        const data = await res.json();
        return data.data || [];
    } catch (error) {
        console.error("Error fetching languages:", error);
        return [];
    }
}

export default async function LocationPage({ params }: { params: { id: string } }) {
    const location = await getLocation(params.id);
    const languages = await getLanguages();

    if (!location) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Hero Section */}
            <div className="relative h-[60vh] w-full">
                <Image
                    src={location.image}
                    alt={location.placeName}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 text-white">
                    <div className="container mx-auto">
                        <h1 className="text-4xl md:text-6xl font-bold mb-4">{location.placeName}</h1>
                        <div className="flex items-center space-x-2 text-lg md:text-xl opacity-90">
                            <MapPin className="w-5 h-5" />
                            <span>Explore this amazing destination</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="container mx-auto px-4 -mt-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Info className="w-6 h-6 text-primary" />
                                About {location.placeName}
                            </h2>
                            <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                                {location.description}
                            </p>
                        </div>
                    </div>

                    {/* Sidebar / Pricing */}
                    <div className="lg:col-span-1">
                        <LocationBookingWidget location={location} languages={languages} />
                    </div>
                </div>
            </div>
        </div>
    );
}
