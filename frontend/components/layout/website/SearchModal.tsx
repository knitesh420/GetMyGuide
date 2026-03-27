"use client";

import { useState, useEffect } from "react";
import { X, Search, MapPin, Package, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { searchResources, clearSearch } from "@/lib/redux/userSlice";
import Image from "next/image";
import Link from "next/link";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [query, setQuery] = useState("");
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { searchResults, isSearching } = useSelector(
        (state: RootState) => state.user
    );

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
            dispatch(clearSearch());
            setQuery("");
        };
    }, [isOpen, onClose, dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                dispatch(searchResources(query));
            } else {
                dispatch(clearSearch());
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, dispatch]);

    const handlePackageClick = (id: string) => {
        router.push(`/tours/${id}`);
        onClose();
    };

    const handleLocationClick = (id: string) => {
        router.push(`/location/${id}`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">
                        Search Tours & Locations
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for tour packages, destinations..."
                            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            autoFocus
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto p-6">
                    {!query && !searchResults && (
                        <div className="px-6 pb-6">
                            <p className="text-sm font-medium text-gray-500 mb-3">
                                Quick Links
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        router.push("/tours");
                                        onClose();
                                    }}
                                    className="flex items-center space-x-3 p-4 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Package className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <Link href="/tours">
                                            <p className="font-semibold text-gray-900">All Tours</p>
                                            <p className="text-xs text-gray-500">Browse packages</p>
                                        </Link>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        router.push("/tours?filter=popular");
                                        onClose();
                                    }}
                                    className="flex items-center space-x-3 p-4 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <MapPin className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <Link href="/find-guides">
                                            <p className="font-semibold text-gray-900">Popular</p>
                                            <p className="text-xs text-gray-500">Book a Guide</p>
                                        </Link>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {searchResults && (
                        <div className="space-y-6">
                            {searchResults.packages.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Packages
                                    </h3>
                                    <div className="space-y-2">
                                        {searchResults.packages.map((pkg) => (
                                            <button
                                                key={pkg._id}
                                                onClick={() => handlePackageClick(pkg._id)}
                                                className="w-full flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {pkg.images && pkg.images[0] ? (
                                                        <Image
                                                            src={pkg.images[0]}
                                                            alt={pkg.title || ""}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="w-8 h-8 text-gray-400 m-auto" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                                                        {pkg.title}
                                                    </p>
                                                    <p className="text-sm text-gray-500 line-clamp-1">
                                                        {pkg.description}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.locations.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Locations
                                    </h3>
                                    <div className="space-y-2">
                                        {searchResults.locations.map((loc) => (
                                            <button
                                                key={loc._id}
                                                onClick={() => handleLocationClick(loc._id)}
                                                className="w-full flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {loc.image ? (
                                                        <Image
                                                            src={loc.image}
                                                            alt={loc.placeName || ""}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <MapPin className="w-8 h-8 text-gray-400 m-auto" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                                                        {loc.placeName}
                                                    </p>
                                                    <p className="text-sm text-gray-500 line-clamp-1">
                                                        {loc.description}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.packages.length === 0 &&
                                searchResults.locations.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No results found for "{query}"
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
