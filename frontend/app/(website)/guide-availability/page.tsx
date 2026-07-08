"use client";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function BookNowForm({ guide }: { guide: Guide }) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [travelingDate, setTravelingDate] = useState("");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setTravelingDate("");
    setMessage("");
    setError("");
    setSubmitted(false);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/guide/contact-inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phoneNumber: phone,
          email,
          nationality: "N/A",
          category: "tour booking" as const,
          subject: `Booking inquiry for guide: ${guide.name}`,
          message: `${travelingDate ? `Traveling Date: ${travelingDate}. ` : ""}${message || `I would like to book guide ${guide.name}.`}`,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to submit. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 transition-colors"
      >
        Book Now
      </button>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-2 space-y-2">
        <p className="text-green-600 font-semibold text-sm">Inquiry Submitted!</p>
        <p className="text-xs text-gray-500">We will connect you with {guide.name} shortly.</p>
        <button
          onClick={resetForm}
          className="text-xs text-indigo-600 hover:underline"
        >
          Back to Guide
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name *"
        required
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email *"
        required
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone *"
        required
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-0.5">
          Traveling Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={travelingDate}
          onChange={(e) => setTravelingDate(e.target.value)}
          required
          min={new Date().toISOString().split("T")[0]}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message (optional)"
        rows={2}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={resetForm}
          className="flex-1 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

interface Guide {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  languages: string[];
  photo: string;
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

      // Public endpoint: approved, currently-visible guides. (The old
      // `/guide/list-all` is admin-only and returns KYC enrollment data, so it
      // 401s for anonymous visitors — which left this page permanently empty.)
      const response = await fetch(`${API_BASE_URL}/guide/all?limit=1000`);

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
        // Shape: { data: { data: GuideProfile[], total, page, totalPages } }
        const list: any[] = data.data?.data ?? [];
        const normalized: Guide[] = list.map((g) => ({
          id: g._id ?? g.id ?? "",
          name: g.name ?? "",
          email: g.email ?? "",
          phone: g.mobile ?? g.phone ?? "",
          city: Array.isArray(g.serviceLocations)
            ? g.serviceLocations[0] ?? ""
            : g.city ?? "",
          languages: Array.isArray(g.languages) ? g.languages : [],
          photo: g.photo ?? "",
        }));

        setGuides(normalized);
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
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col"
                  >
                    {/* Guide Image */}
                    <div className="relative h-36 bg-gradient-to-br from-indigo-100 to-purple-100 shrink-0">
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

                    {/* Guide Info */}
                    <div className="p-3 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {guide.name}
                        </h3>
                        <div className="flex items-center text-gray-700 shrink-0">
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

                      {/* Languages */}
                      <div className="mb-3">
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

                      {/* Book Now Button / Form */}
                      <div className="mt-auto">
                        <BookNowForm guide={guide} />
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
