"use client";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Guide {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  type: "normal" | "escort";
  pan?: string;
  licence: string;
  aadhar: string;
  languages: string[];
  photo: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to get image URL
const getImageUrl = (guide: Guide): string | null => {
  if (guide.photo) {
    if (
      guide.photo.startsWith("http://") ||
      guide.photo.startsWith("https://")
    ) {
      return guide.photo;
    }
    if (guide.photo.startsWith("/media/")) {
      return `${API_BASE_URL}${guide.photo}`;
    }
    return `${API_BASE_URL}/media/misc/${guide.photo}`;
  }
  return null;
};

export default function GuideAvailabilityPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch guides from API
  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/guide/list-all`);

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server did not return JSON. Please check if the API endpoint exists.",
        );
      }

      const data = await response.json();

      if (data.success || data.data) {
        const enrollments: Guide[] =
          data.data?.enrollments || data.enrollments || [];

        setGuides(enrollments);
      } else {
        setError(data.message || "Failed to fetch guides");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching guides");
    } finally {
      setLoading(false);
    }
  };

  // Filter guides based on search query
  const filteredGuides = guides.filter((guide) => {
    const matchesSearch =
      guide.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.languages.some((lang) =>
        lang.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-10">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        {/* <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Guide Availability
          </h1>
          <p className="text-lg text-gray-600">
            Browse and search available tour guides
          </p>
        </div> */}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          {/* Search Bar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Guides
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, location, or language..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredGuides.length} of {guides.length} guides
            </span>
            <button
              onClick={fetchGuides}
              className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Guides Grid */}
        {!loading && !error && (
          <>
            {filteredGuides.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-10 text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Guides Found
                </h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "No guides available at the moment"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col h-[320px]"
                  >
                    {/* Guide Image - Fixed Height */}
                    <div className="relative h-36 bg-gradient-to-br from-indigo-100 to-purple-100 flex-shrink-0">
                      {getImageUrl(guide) ? (
                        <img
                          src={getImageUrl(guide)!}
                          alt={guide.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              const placeholder =
                                parent.querySelector(".placeholder-icon");
                              if (placeholder) {
                                (placeholder as HTMLElement).style.display =
                                  "flex";
                              }
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="placeholder-icon w-full h-full flex items-center justify-center"
                        style={{
                          display: getImageUrl(guide) ? "none" : "flex",
                        }}
                      >
                        <svg
                          className="w-16 h-16 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Guide Info - Fixed Height with Overflow */}
                    <div className="p-3 flex flex-col flex-1 overflow-hidden">
                      {/* Guide Name and Location - Side by Side */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {guide.name}
                        </h3>
                        <div className="flex items-center text-gray-700 flex-shrink-0">
                          <svg
                            className="w-3 h-3 mr-1 text-indigo-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span className="text-xs font-medium">
                            {guide.city}
                          </span>
                        </div>
                      </div>

                      {/* Languages - Improved Display */}
                      <div className="flex-1 overflow-hidden">
                        <div className="mb-2">
                          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Languages
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {guide.languages.slice(0, 3).map((lang, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-medium shadow-sm hover:shadow-md transition-shadow"
                              >
                                {lang}
                              </span>
                            ))}
                            {guide.languages.length > 3 && (
                              <span className="px-2 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-md text-[10px] font-medium">
                                +{guide.languages.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
