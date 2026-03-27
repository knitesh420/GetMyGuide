"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store";
import { logoutUser } from "@/lib/redux/authSlice";
import {
  Users,
  UserCheck,
  MessageSquare,
  Package,
  LayoutDashboard,
  Menu,
  X,
  Eye,
  XCircle,
  Trash2,
  Download,
  LogOut,
  Film,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import dynamic from "next/dynamic";

interface Guide {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  type: string;
  languages: string[];
  photo: string;
  status: string;
  createdAt: string;
  pan?: string;
  licence?: string;
  aadhar?: string;
  updatedAt?: string;
  transaction?: {
    transaction_id: string;
    razorpay_order_id: string;
    amount: number;
    currency: string;
    status: string;
  };
}

interface Tourist {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  gender: string;
  role: string;
  status: string;
  createdAt: string;
  bookingCount: number;
  totalSpent: number;
  lastBookingDate: string;
  cities: string[];
  bookings: Booking[];
  services: {
    city: string;
    places: string[];
    duration: string;
    price: number;
    date: string;
    preferences: {
      hotel: boolean;
      taxi: boolean;
    };
  }[];
}

interface Booking {
  id: string;
  tourist_info: {
    name: string;
    email: string;
    phone: string;
    country: string;
    gender: string;
  };
  travel_details: {
    city: string;
    date: string;
    no_of_person: number;
    places: string[];
    preferences: {
      hotel: boolean;
      taxi: boolean;
    };
  };
  guide_preferences: {
    guide_language: string[];
    gender: string;
  };
  booking_configuration: {
    duration: string;
    foreign_language_required: boolean;
    outstation?: {
      distance: number;
      over_night_stay: number;
      accomodation_meals: boolean;
      special_excursion?: string[];
    };
    early_late_hours: boolean;
    extra_city_allowances: boolean;
    special_event_allowances: string[];
    price: number;
  };
  linked_to?: string;
  transaction_id?: string;
  allocated_guide?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

interface ServicePackage {
  id: string;
  title: string;
  city: string;
  places: string[];
  images: string[];
  status: string;
  createdAt: string;
}

interface Lead {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  nationality: string;
  category: "tour booking" | "become a guide" | "other";
  subject: string;
  message: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
  updatedAt: string;
}

interface Advertisement {
  id: string;
  title: string;
  description: string;
  videoFilename: string;
  thumbnailFilename?: string;
  isActive: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

function AdminDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector(
    (state: RootState) => state.auth,
  );
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [loadingGuideDetails, setLoadingGuideDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleDeleteGuide = async (guideId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this guide? This action can be undone by reactivating in the DB.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/guide/enrollment/${guideId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Delete failed:", res.status, txt);
        alert(`Failed to delete guide: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      // Remove guide from UI list
      setGuides((prev) => prev.filter((g) => g.id !== guideId));
      alert(data?.message || "Guide deleted successfully");
    } catch (err) {
      console.error("Error deleting guide:", err);
      alert("Error deleting guide");
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "guides",
      label: "Registered Guides",
      icon: UserCheck,
    },
    {
      id: "tourists",
      label: "Registered Tourists",
      icon: Users,
    },
    {
      id: "bookings",
      label: "Contact Inquiries",
      icon: MessageSquare,
    },
    {
      id: "advertisements",
      label: "Advertisements",
      icon: Film,
    },
  ];

  useEffect(() => {
    if (activeTab !== "dashboard") {
      fetchData(activeTab);
    }
  }, [activeTab]);

  // Handle authentication check and redirect in effect, not during render
  useEffect(() => {
    if (
      isAuthenticated !== null &&
      (!isAuthenticated || user?.role !== "admin")
    ) {
      router.replace("/");
    }
  }, [isAuthenticated, user?.role, router]);

  // Don't render anything if not authenticated or not admin
  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const fetchGuideById = async (id: string) => {
    setLoadingGuideDetails(true);
    try {
      const response = await fetch(`${API_BASE}/api/guide/enroll-status/${id}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedGuide(data.data);
      } else {
        console.error("Failed to fetch guide details:", data.error);
        alert("Failed to load guide details");
      }
    } catch (error) {
      console.error("Error fetching guide details:", error);
      alert("Error loading guide details");
    } finally {
      setLoadingGuideDetails(false);
    }
  };

  const fetchData = async (tab: string) => {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case "guides":
          const guidesRes = await fetch(`${API_BASE}/api/guide/list-all`, {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!guidesRes.ok) {
            console.error(
              "Failed to fetch guides:",
              guidesRes.status,
              guidesRes.statusText,
            );
            const errorText = await guidesRes.text();
            console.error("Error response:", errorText);
            alert(
              `Failed to fetch guides: ${guidesRes.status} ${guidesRes.statusText}`,
            );
            break;
          }

          const guidesData = await guidesRes.json();

          if (guidesData.success && guidesData.enrollments) {
            setGuides(guidesData.enrollments);
          } else {
            setGuides([]);
          }
          break;

        case "tourists":
          const touristBookingsRes = await fetch(`${API_BASE}/api/booking`, {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!touristBookingsRes.ok) {
            console.error(
              "Failed to fetch tourists:",
              touristBookingsRes.status,
              touristBookingsRes.statusText,
            );
            const errorText = await touristBookingsRes.text();
            console.error("Error response:", errorText);
            setTourists([]);
            break;
          }

          const touristBookingsData = await touristBookingsRes.json();

          // Handle both response structures: {bookings: [...]} or {data: {bookings: [...]}}
          const touristBookingsArray =
            touristBookingsData.bookings || touristBookingsData.data?.bookings;

          if (touristBookingsData.success && touristBookingsArray) {
            // Extract unique tourists from bookings with aggregated data
            const uniqueTouristsMap = new Map<string, Tourist>();

            touristBookingsArray.forEach((booking: Booking) => {
              const email = booking.tourist_info.email;

              if (!uniqueTouristsMap.has(email)) {
                // Create new tourist entry
                uniqueTouristsMap.set(email, {
                  id: booking.id,
                  name: booking.tourist_info.name,
                  email: booking.tourist_info.email,
                  phone: booking.tourist_info.phone,
                  country: booking.tourist_info.country,
                  gender: booking.tourist_info.gender,
                  role: "tourist",
                  status: booking.status,
                  createdAt: booking.createdAt,
                  bookingCount: 1,
                  totalSpent: booking.booking_configuration.price,
                  lastBookingDate: booking.createdAt,
                  cities: [booking.travel_details.city],
                  bookings: [booking],
                  services: [
                    {
                      city: booking.travel_details.city,
                      places: booking.travel_details.places,
                      duration: booking.booking_configuration.duration,
                      price: booking.booking_configuration.price,
                      date: booking.travel_details.date,
                      preferences: booking.travel_details.preferences,
                    },
                  ],
                });
              } else {
                // Update existing tourist with new booking data
                const existingTourist = uniqueTouristsMap.get(email)!;
                existingTourist.bookingCount += 1;
                existingTourist.totalSpent +=
                  booking.booking_configuration.price;

                // Update to latest booking date
                if (
                  new Date(booking.createdAt) >
                  new Date(existingTourist.lastBookingDate)
                ) {
                  existingTourist.lastBookingDate = booking.createdAt;
                  existingTourist.status = booking.status;
                }

                // Add city if not already in list
                if (
                  !existingTourist.cities.includes(booking.travel_details.city)
                ) {
                  existingTourist.cities.push(booking.travel_details.city);
                }

                // Add full booking to bookings array
                existingTourist.bookings.push(booking);

                // Add service details
                existingTourist.services.push({
                  city: booking.travel_details.city,
                  places: booking.travel_details.places,
                  duration: booking.booking_configuration.duration,
                  price: booking.booking_configuration.price,
                  date: booking.travel_details.date,
                  preferences: booking.travel_details.preferences,
                });
              }
            });

            const touristsList = Array.from(uniqueTouristsMap.values());
            setTourists(touristsList);
          } else {
            setTourists([]);
          }
          break;

        case "bookings":
          try {
            const leadsRes = await fetch(`${API_BASE}/api/lead/contact`, {
              credentials: "include",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (leadsRes.ok) {
              const leadsData = await leadsRes.json();

              // Handle both response structures: {data: {inquiries: [...]}} or {inquiries: [...]}
              const inquiriesArray =
                leadsData.data?.inquiries || leadsData.inquiries;

              if (leadsData.success && inquiriesArray) {
                setLeads(inquiriesArray);
              } else {
                setLeads([]);
              }
            } else {
              const errorText = await leadsRes.text();
              console.error(
                "Failed to fetch leads:",
                leadsRes.status,
                leadsRes.statusText,
                errorText,
              );
              alert(`Failed to fetch leads: ${leadsRes.status} - ${errorText}`);
              setLeads([]);
            }
          } catch (error) {
            console.error("Error fetching leads:", error);
            alert(`Error fetching leads: ${error}`);
            setLeads([]);
          }
          break;

        case "advertisements":
          try {
            const adsRes = await fetch(`${API_BASE}/api/advertisement/admin/all`, {
              credentials: "include",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (adsRes.ok) {
              const adsData = await adsRes.json();

              // Handle response structure: {data: [...]} or [...]
              const adsArray = Array.isArray(adsData.data)
                ? adsData.data
                : adsData;

              if (Array.isArray(adsArray)) {
                setAdvertisements(adsArray);
              } else {
                setAdvertisements([]);
              }
            } else {
              const errorText = await adsRes.text();
              console.error(
                "Failed to fetch advertisements:",
                adsRes.status,
                adsRes.statusText,
                errorText,
              );
              alert(`Failed to fetch advertisements: ${adsRes.status}`);
              setAdvertisements([]);
            }
          } catch (error) {
            console.error("Error fetching advertisements:", error);
            alert(`Error fetching advertisements: ${error}`);
            setAdvertisements([]);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab}:`, error);
      const errorMessage = `Error fetching ${tab}: ${error instanceof Error ? error.message : "Unknown error"}`;
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex  mt-20">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 p-3 mb-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {menuItems.find((item) => item.id === activeTab)?.label}
              </h1>
              <p className="text-gray-600">
                Manage and view all {activeTab} information
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab !== "dashboard" && (
                <button
                  onClick={() => fetchData(activeTab)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
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
                  Refresh
                </button>
              )}
              <button
                onClick={async () => {
                  await logout();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Data count display */}
            {activeTab !== "dashboard" && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  Total {activeTab}:{" "}
                  <span className="font-semibold text-gray-900">
                    {activeTab === "guides" && guides.length}
                    {activeTab === "tourists" && tourists.length}
                    {activeTab === "bookings" && leads.length}
                    {activeTab === "advertisements" && advertisements.length}
                  </span>
                </p>
              </div>
            )}

            {activeTab === "dashboard" && (
              <DashboardOverview
                guidesCount={guides.length}
                touristsCount={tourists.length}
                bookingsCount={leads.length}
              />
            )}
            {activeTab === "guides" && (
              <>
                {guides.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">
                      No guide enrollments found.
                    </p>
                    <p className="text-sm text-gray-400">
                      Make sure you're logged in as an admin. Check the browser
                      console for errors.
                    </p>
                  </div>
                )}
                {guides.length > 0 && (
                  <GuidesTable
                    guides={guides}
                    onViewDetails={fetchGuideById}
                    onDelete={handleDeleteGuide}
                  />
                )}
              </>
            )}
            {activeTab === "tourists" && (
              <>
                {tourists.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No tourists found.</p>
                  </div>
                )}
                {tourists.length > 0 && <TouristsTable tourists={tourists} />}
              </>
            )}
            {activeTab === "bookings" && (
              <>
                {leads.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No contact submissions found.
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Contact form submissions will appear here after users
                      submit the contact form.
                    </p>
                    <p className="text-xs text-gray-400 mt-4">
                      Test by visiting:{" "}
                      <a
                        href="/contact-inquiry"
                        className="text-blue-500 underline"
                      >
                        /contact-inquiry
                      </a>{" "}
                      and submitting the form
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Check the browser console for API errors if you've already
                      submitted forms.
                    </p>
                  </div>
                )}
                {leads.length > 0 && <LeadsTable leads={leads} />}
              </>
            )}
            {activeTab === "advertisements" && (
              <>
                {advertisements.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">
                      No advertisements found.
                    </p>
                    <button
                      onClick={() => {
                        // You can add a modal for creating new advertisement here
                        alert(
                          "Click the upload button in the header to create a new advertisement",
                        );
                      }}
                      className="text-blue-500 hover:text-blue-600 underline"
                    >
                      Create your first advertisement
                    </button>
                  </div>
                )}
                {advertisements.length > 0 && (
                  <AdvertisementsTable
                    advertisements={advertisements}
                    onDelete={(id) => {
                      setAdvertisements((prev) =>
                        prev.filter((ad) => ad.id !== id),
                      );
                    }}
                    onUpdate={() => fetchData("advertisements")}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Guide Details Modal */}
      {selectedGuide && (
        <GuideDetailsModal
          guide={selectedGuide}
          loading={loadingGuideDetails}
          onClose={() => setSelectedGuide(null)}
        />
      )}
    </div>
  );
}

// Wrap the component with dynamic import to avoid SSR issues with location global reference
const AdminDashboardDynamic = dynamic(
  () => {
    return Promise.resolve({ default: AdminDashboard });
  },
  {
    ssr: false,
  },
);

export default AdminDashboardDynamic;

// Dashboard Overview Component
function DashboardOverview({
  guidesCount,
  touristsCount,
  bookingsCount,
}: {
  guidesCount: number;
  touristsCount: number;
  bookingsCount: number;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">
        Welcome to Admin Dashboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Guides"
          value={guidesCount.toString()}
          icon={UserCheck}
          color="blue"
        />
        <StatsCard
          title="Total Tourists"
          value={touristsCount.toString()}
          icon={Users}
          color="green"
        />
        <StatsCard
          title="Total Enquiries"
          value={bookingsCount.toString()}
          icon={MessageSquare}
          color="purple"
        />
      </div>
      <p className="text-gray-600 mt-8">
        Select an option from the sidebar to view detailed information.
      </p>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div
          className={`p-3 rounded-full ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Guides Table Component
function GuidesTable({
  guides,
  onViewDetails,
  onDelete,
}: {
  guides: Guide[];
  onViewDetails: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const toggleExpand = (guideId: string) => {
    setExpandedGuide(expandedGuide === guideId ? null : guideId);
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return (
    <div className="space-y-4">
      {guides.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No guides found</div>
      ) : (
        guides.map((guide) => (
          <div
            key={guide.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Guide Summary */}
            <div
              className="bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(guide.id)}
            >
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={`${API_BASE}/media/misc/${guide.photo}`}
                      alt={guide.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-100"
                    />
                    <div>
                      <p className="text-base font-medium text-gray-900">
                        {guide.name}
                      </p>
                      <p className="text-xs text-gray-500">{guide.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="text-base font-medium text-gray-900">
                    {guide.city}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="text-base font-medium text-gray-900 capitalize">
                    {guide.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Languages</p>
                  <p className="text-base font-medium text-gray-900">
                    {guide.languages.slice(0, 2).join(", ")}
                    {guide.languages.length > 2 && "..."}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      guide.status === "verified"
                        ? "bg-green-100 text-green-800"
                        : guide.status === "payment-pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {guide.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(guide.id);
                    }}
                    className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    {expandedGuide === guide.id ? "View Less" : "View More"}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedGuide === guide.id && (
              <div className="bg-gray-50 p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Personal Information */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Personal Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <img
                          src={`${API_BASE}/media/misc/${guide.photo}`}
                          alt={guide.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {guide.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {guide.type} Guide
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Email: </span>
                        <span className="font-medium">{guide.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone: </span>
                        <span className="font-medium">{guide.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">City: </span>
                        <span className="font-medium">{guide.city}</span>
                      </div>
                      {guide.pan && (
                        <div>
                          <span className="text-gray-600">PAN: </span>
                          <span className="font-medium">{guide.pan}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional Details */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Professional Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Guide Type: </span>
                        <span className="font-medium capitalize">
                          {guide.type}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            guide.status === "verified"
                              ? "bg-green-100 text-green-800"
                              : guide.status === "payment-pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {guide.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Languages: </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {guide.languages.map((lang, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Registered: </span>
                        <span className="font-medium">
                          {new Date(guide.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {guide.updatedAt && (
                        <div>
                          <span className="text-gray-600">Last Updated: </span>
                          <span className="font-medium">
                            {new Date(guide.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Documents
                    </h4>
                    <div className="space-y-3 text-sm">
                      {guide.licence ? (
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                          <p className="text-xs text-gray-600 mb-1">
                            Licence Document
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `${API_BASE}/media/misc/${guide.licence}`,
                                "_blank",
                              );
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download Licence
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          No licence uploaded
                        </p>
                      )}

                      {guide.aadhar ? (
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                          <p className="text-xs text-gray-600 mb-1">
                            Aadhar Document
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `${API_BASE}/media/misc/${guide.aadhar}`,
                                "_blank",
                              );
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download Aadhar
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          No aadhar uploaded
                        </p>
                      )}

                      <div className="pt-2">
                        <span className="text-gray-600">Guide ID: </span>
                        <span className="font-mono text-xs">{guide.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  {guide.transaction && (
                    <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-600" />
                        Payment Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Amount: </span>
                          <span className="font-bold text-green-600">
                            ₹{guide.transaction.amount}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Transaction ID:{" "}
                          </span>
                          <span className="font-mono text-xs break-all">
                            {guide.transaction.transaction_id}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Order ID: </span>
                          <span className="font-mono text-xs break-all">
                            {guide.transaction.razorpay_order_id}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status: </span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              guide.transaction.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : guide.transaction.status === "created"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {guide.transaction.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Currency: </span>
                          <span className="font-medium uppercase">
                            {guide.transaction.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Full Details + Delete Button */}
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(guide.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Full Details
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(guide.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Tourists Table Component
function TouristsTable({ tourists }: { tourists: Tourist[] }) {
  const [expandedTourist, setExpandedTourist] = useState<string | null>(null);

  const toggleExpand = (touristId: string) => {
    setExpandedTourist(expandedTourist === touristId ? null : touristId);
  };

  return (
    <div className="space-y-4">
      {tourists.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No tourists found</div>
      ) : (
        tourists.map((tourist) => (
          <div
            key={tourist.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Tourist Summary */}
            <div
              className="bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(tourist.id)}
            >
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-gray-900">
                        {tourist.name}
                      </p>
                      <p className="text-xs text-gray-500">{tourist.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Country</p>
                  <p className="text-base font-medium text-gray-900">
                    {tourist.country}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bookings</p>
                  <p className="text-base font-medium text-gray-900">
                    {tourist.bookingCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-base font-medium text-green-600">
                    ₹{tourist.totalSpent.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      tourist.status === "successful" ||
                      tourist.status === "verified" ||
                      tourist.status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : tourist.status === "payment-pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {tourist.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(tourist.id);
                    }}
                    className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    {expandedTourist === tourist.id ? "View Less" : "View More"}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedTourist === tourist.id && (
              <div className="bg-gray-50 p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Personal Information */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Personal Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name: </span>
                        <span className="font-medium">{tourist.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email: </span>
                        <span className="font-medium">{tourist.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone: </span>
                        <span className="font-medium">{tourist.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Country: </span>
                        <span className="font-medium">{tourist.country}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Gender: </span>
                        <span className="font-medium capitalize">
                          {tourist.gender}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Statistics */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Booking Statistics
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Total Bookings: </span>
                        <span className="font-medium text-blue-600">
                          {tourist.bookingCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Spent: </span>
                        <span className="font-medium text-green-600">
                          ₹{tourist.totalSpent.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg per Booking: </span>
                        <span className="font-medium">
                          ₹
                          {Math.round(
                            tourist.totalSpent / tourist.bookingCount,
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span
                          className={`px-1.5 py-0 text-xs rounded-full ${
                            tourist.status === "successful" ||
                            tourist.status === "verified" ||
                            tourist.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : tourist.status === "payment-pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {tourist.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Travel Information */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Travel Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Cities Visited: </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tourist.cities.map((city, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded"
                            >
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">First Booking: </span>
                        <span className="font-medium">
                          {new Date(tourist.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Booking: </span>
                        <span className="font-medium">
                          {new Date(
                            tourist.lastBookingDate,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tourist ID: </span>
                        <span className="font-mono text-xs">{tourist.id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Complete Booking Details Section */}
                {tourist.bookings && tourist.bookings.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Complete Booking Details ({tourist.bookings.length}{" "}
                      bookings)
                    </h4>
                    <div className="space-y-6">
                      {tourist.bookings.map((booking, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm"
                        >
                          {/* Booking Header */}
                          <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                            <div>
                              <h5 className="font-bold text-lg text-gray-900">
                                Booking #{idx + 1} -{" "}
                                {booking.travel_details.city}
                              </h5>
                              <p className="text-sm text-gray-500 mt-1">
                                Booking ID:{" "}
                                <span className="font-mono">{booking.id}</span>
                              </p>
                              {booking.transaction_id && (
                                <p className="text-sm text-gray-500">
                                  Transaction ID:{" "}
                                  <span className="font-mono">
                                    {booking.transaction_id}
                                  </span>
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-3 py-1 text-sm rounded-full font-semibold ${
                                  booking.status === "successful" ||
                                  booking.status === "confirmed" ||
                                  booking.status === "allocated" ||
                                  booking.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : booking.status === "payment-pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {booking.status}
                              </span>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(booking.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Travel Details */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h6 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Travel Details
                              </h6>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Date: </span>
                                  <span className="font-medium">
                                    {new Date(
                                      booking.travel_details.date,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Persons:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {booking.travel_details.no_of_person}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Places:{" "}
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {booking.travel_details.places.map(
                                      (place, pIdx) => (
                                        <span
                                          key={pIdx}
                                          className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                                        >
                                          {place}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-gray-600">
                                    Preferences:{" "}
                                  </span>
                                  <div className="mt-1 flex gap-2">
                                    {booking.travel_details.preferences
                                      .hotel && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                        Hotel
                                      </span>
                                    )}
                                    {booking.travel_details.preferences
                                      .taxi && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                        Taxi
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Guide Preferences */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h6 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <UserCheck className="w-4 h-4" />
                                Guide Preferences
                              </h6>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-600">
                                    Gender:{" "}
                                  </span>
                                  <span className="font-medium capitalize">
                                    {booking.guide_preferences.gender}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Languages:{" "}
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {booking.guide_preferences.guide_language
                                      .length > 0 ? (
                                      booking.guide_preferences.guide_language.map(
                                        (lang, lIdx) => (
                                          <span
                                            key={lIdx}
                                            className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded"
                                          >
                                            {lang}
                                          </span>
                                        ),
                                      )
                                    ) : (
                                      <span className="text-gray-500 text-xs">
                                        None specified
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {booking.allocated_guide && (
                                  <div>
                                    <span className="text-gray-600">
                                      Allocated Guide:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {booking.allocated_guide}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Booking Configuration */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h6 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4" />
                                Configuration
                              </h6>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-600">
                                    Duration:{" "}
                                  </span>
                                  <span className="font-medium capitalize">
                                    {booking.booking_configuration.duration}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Price: </span>
                                  <span className="font-bold text-green-600 text-lg">
                                    ₹
                                    {booking.booking_configuration.price.toLocaleString()}
                                  </span>
                                </div>
                                <div className="space-y-1 mt-2">
                                  {booking.booking_configuration
                                    .foreign_language_required && (
                                    <span className="block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded w-fit">
                                      ✓ Foreign Language Required
                                    </span>
                                  )}
                                  {booking.booking_configuration
                                    .early_late_hours && (
                                    <span className="block text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded w-fit">
                                      ✓ Early/Late Hours
                                    </span>
                                  )}
                                  {booking.booking_configuration
                                    .extra_city_allowances && (
                                    <span className="block text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded w-fit">
                                      ✓ Extra City Allowances
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Special Events */}
                            {booking.booking_configuration
                              .special_event_allowances &&
                              booking.booking_configuration
                                .special_event_allowances.length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <h6 className="font-semibold text-gray-800 mb-3">
                                    Special Events
                                  </h6>
                                  <div className="flex flex-wrap gap-1">
                                    {booking.booking_configuration.special_event_allowances.map(
                                      (event, eIdx) => (
                                        <span
                                          key={eIdx}
                                          className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded"
                                        >
                                          {event}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Outstation Details */}
                            {booking.booking_configuration.outstation && (
                              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                <h6 className="font-semibold text-gray-800 mb-3">
                                  Outstation Travel Details
                                </h6>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600">
                                      Distance:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {
                                        booking.booking_configuration.outstation
                                          .distance
                                      }{" "}
                                      km
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">
                                      Overnight Stay:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {
                                        booking.booking_configuration.outstation
                                          .over_night_stay
                                      }{" "}
                                      night(s)
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">
                                      Accommodation & Meals:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {booking.booking_configuration.outstation
                                        .accomodation_meals
                                        ? "✓ Included"
                                        : "✗ Not Included"}
                                    </span>
                                  </div>
                                  {booking.booking_configuration.outstation
                                    .special_excursion &&
                                    booking.booking_configuration.outstation
                                      .special_excursion.length > 0 && (
                                      <div className="col-span-2">
                                        <span className="text-gray-600">
                                          Special Excursions:{" "}
                                        </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {booking.booking_configuration.outstation.special_excursion.map(
                                            (exc, exIdx) => (
                                              <span
                                                key={exIdx}
                                                className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded"
                                              >
                                                {exc}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(!tourist.bookings || tourist.bookings.length === 0) && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-gray-500 text-sm">
                      No booking details available
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Bookings Table Component
function BookingsTable({ bookings }: { bookings: Booking[] }) {
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  const toggleExpand = (bookingId: string) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
  };

  return (
    <div className="space-y-4">
      {bookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No bookings found</div>
      ) : (
        bookings.map((booking) => (
          <div
            key={booking.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Booking Summary */}
            <div
              className="bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(booking.id)}
            >
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Tourist</p>
                  <p className="text-base font-medium text-gray-900">
                    {booking.tourist_info.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {booking.tourist_info.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="text-base font-medium text-gray-900">
                    {booking.travel_details.city}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="text-base font-medium text-gray-900">
                    {new Date(booking.travel_details.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="text-base font-medium text-gray-900">
                    ₹{booking.booking_configuration.price.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      booking.status === "successful" ||
                      booking.status === "confirmed" ||
                      booking.status === "allocated"
                        ? "bg-green-100 text-green-800"
                        : booking.status === "payment-pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : booking.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {booking.status}
                  </span>
                  <Eye
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedBooking === booking.id ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedBooking === booking.id && (
              <div className="bg-gray-50 p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Tourist Information */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Tourist Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name: </span>
                        <span className="font-medium">
                          {booking.tourist_info.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email: </span>
                        <span className="font-medium">
                          {booking.tourist_info.email}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone: </span>
                        <span className="font-medium">
                          {booking.tourist_info.phone}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Country: </span>
                        <span className="font-medium">
                          {booking.tourist_info.country}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Gender: </span>
                        <span className="font-medium capitalize">
                          {booking.tourist_info.gender}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Travel Details */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Travel Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">City: </span>
                        <span className="font-medium">
                          {booking.travel_details.city}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date: </span>
                        <span className="font-medium">
                          {new Date(
                            booking.travel_details.date,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Persons: </span>
                        <span className="font-medium">
                          {booking.travel_details.no_of_person}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Places: </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {booking.travel_details.places.map((place, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {place}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Preferences: </span>
                        <div className="mt-1 space-x-2">
                          {booking.travel_details.preferences.hotel && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Hotel
                            </span>
                          )}
                          {booking.travel_details.preferences.taxi && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Taxi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Guide Preferences */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Guide Preferences
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Gender: </span>
                        <span className="font-medium capitalize">
                          {booking.guide_preferences.gender}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Languages: </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {booking.guide_preferences.guide_language.length >
                          0 ? (
                            booking.guide_preferences.guide_language.map(
                              (lang, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded"
                                >
                                  {lang}
                                </span>
                              ),
                            )
                          ) : (
                            <span className="text-gray-500 text-xs">
                              None specified
                            </span>
                          )}
                        </div>
                      </div>
                      {booking.allocated_guide && (
                        <div>
                          <span className="text-gray-600">
                            Allocated Guide:{" "}
                          </span>
                          <span className="font-medium">
                            {booking.allocated_guide}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Booking Configuration */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Configuration
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Duration: </span>
                        <span className="font-medium capitalize">
                          {booking.booking_configuration.duration}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Price: </span>
                        <span className="font-medium text-green-600">
                          ₹
                          {booking.booking_configuration.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {booking.booking_configuration
                          .foreign_language_required && (
                          <span className="block text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded w-fit">
                            Foreign Language Required
                          </span>
                        )}
                        {booking.booking_configuration.early_late_hours && (
                          <span className="block text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded w-fit">
                            Early/Late Hours
                          </span>
                        )}
                        {booking.booking_configuration
                          .extra_city_allowances && (
                          <span className="block text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded w-fit">
                            Extra City Allowances
                          </span>
                        )}
                      </div>
                      {booking.booking_configuration.special_event_allowances
                        .length > 0 && (
                        <div>
                          <span className="text-gray-600">Events: </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {booking.booking_configuration.special_event_allowances.map(
                              (event, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded"
                                >
                                  {event}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Outstation Details */}
                  {booking.booking_configuration.outstation && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">
                        Outstation Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Distance: </span>
                          <span className="font-medium">
                            {booking.booking_configuration.outstation.distance}{" "}
                            km
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Overnight Stay:{" "}
                          </span>
                          <span className="font-medium">
                            {
                              booking.booking_configuration.outstation
                                .over_night_stay
                            }{" "}
                            night(s)
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Accommodation & Meals:{" "}
                          </span>
                          <span className="font-medium">
                            {booking.booking_configuration.outstation
                              .accomodation_meals
                              ? "Yes"
                              : "No"}
                          </span>
                        </div>
                        {booking.booking_configuration.outstation
                          .special_excursion &&
                          booking.booking_configuration.outstation
                            .special_excursion.length > 0 && (
                            <div>
                              <span className="text-gray-600">
                                Excursions:{" "}
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {booking.booking_configuration.outstation.special_excursion.map(
                                  (exc, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded"
                                    >
                                      {exc}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Transaction Details */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">
                      Transaction Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Booking ID: </span>
                        <span className="font-mono text-xs">{booking.id}</span>
                      </div>
                      {booking.transaction_id && (
                        <div>
                          <span className="text-gray-600">
                            Transaction ID:{" "}
                          </span>
                          <span className="font-mono text-xs">
                            {booking.transaction_id}
                          </span>
                        </div>
                      )}
                      {booking.linked_to && (
                        <div>
                          <span className="text-gray-600">Linked To: </span>
                          <span className="font-mono text-xs">
                            {booking.linked_to}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Created: </span>
                        <span className="font-medium">
                          {new Date(booking.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {booking.updatedAt && (
                        <div>
                          <span className="text-gray-600">Updated: </span>
                          <span className="font-medium">
                            {new Date(booking.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Services Table Component
function ServicesTable({ packages }: { packages: ServicePackage[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Image
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              City
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Places
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {packages.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                No services found
              </td>
            </tr>
          ) : (
            packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {pkg.images.length > 0 && (
                    <img
                      src={`${API_BASE}/media/packages/${pkg.images[0]}`}
                      alt={pkg.title}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {pkg.title}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{pkg.city}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {pkg.places.slice(0, 2).join(", ")}
                  {pkg.places.length > 2 && "..."}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      pkg.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {pkg.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(pkg.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Guide Details Modal Component
function GuideDetailsModal({
  guide,
  loading,
  onClose,
}: {
  guide: Guide;
  loading: boolean;
  onClose: () => void;
}) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleDownload = (filename: string, type: "licence" | "aadhar") => {
    const url = `${API_BASE}/media/misc/${filename}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Guide Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XCircle className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Personal Information Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={`${API_BASE}/media/misc/${guide.photo}`}
                      alt={guide.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    <div>
                      <p className="text-sm text-gray-600">Profile Photo</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {guide.name}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`inline-block px-3 py-1 text-sm rounded-full mt-1 ${
                        guide.status === "verified"
                          ? "bg-green-100 text-green-800"
                          : guide.status === "payment-pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {guide.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-base font-medium text-gray-900">
                      {guide.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-base font-medium text-gray-900">
                      {guide.phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="text-base font-medium text-gray-900">
                      {guide.city}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Guide Type</p>
                    <p className="text-base font-medium text-gray-900 capitalize">
                      {guide.type}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Languages</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {guide.languages.map((lang, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  {guide.pan && (
                    <div>
                      <p className="text-sm text-gray-600">PAN Number</p>
                      <p className="text-base font-medium text-gray-900">
                        {guide.pan}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guide.licence && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                      <p className="text-sm text-gray-600 mb-2">
                        Licence Document
                      </p>
                      <button
                        onClick={() =>
                          handleDownload(guide.licence!, "licence")
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Licence
                      </button>
                    </div>
                  )}

                  {guide.aadhar && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                      <p className="text-sm text-gray-600 mb-2">
                        Aadhar Document
                      </p>
                      <button
                        onClick={() => handleDownload(guide.aadhar!, "aadhar")}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Aadhar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Registration Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Registered On</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(guide.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {guide.updatedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="text-base font-medium text-gray-900">
                        {new Date(guide.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Details Section */}
              {guide.transaction && (
                <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Payment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Amount Paid</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{guide.transaction.amount}{" "}
                        {guide.transaction.currency.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Status</p>
                      <span
                        className={`inline-block px-3 py-1 text-sm rounded-full mt-1 font-semibold ${
                          guide.transaction.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : guide.transaction.status === "created"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {guide.transaction.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Transaction ID</p>
                      <p className="text-sm font-mono text-gray-900 break-all">
                        {guide.transaction.transaction_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Razorpay Order ID</p>
                      <p className="text-sm font-mono text-gray-900 break-all">
                        {guide.transaction.razorpay_order_id}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Leads Table Component
function LeadsTable({ leads }: { leads: Lead[] }) {
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const toggleExpand = (leadId: string) => {
    setExpandedLead(expandedLead === leadId ? null : leadId);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "tour booking":
        return "bg-purple-100 text-purple-800";
      case "become a guide":
        return "bg-blue-100 text-blue-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {leads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No leads found</div>
      ) : (
        leads.map((lead) => (
          <div
            key={lead._id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Lead Summary */}
            <div
              className="bg-white p-2 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(lead._id)}
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-base font-medium text-gray-900">
                    {lead.fullName}
                  </p>
                  <p className="text-xs text-gray-500">{lead.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-base font-medium text-gray-900">
                    {lead.phoneNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ${getCategoryColor(lead.category)}`}
                  >
                    {lead.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(lead._id);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 flex-shrink-0"
                  >
                    {expandedLead === lead._id ? "View Less" : "View More"}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedLead === lead._id && (
              <div className="bg-gray-50 p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 gap-6">
                  {/* Additional Information */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Additional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Nationality: </span>
                        <span className="font-medium">{lead.nationality}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Subject: </span>
                        <span className="font-medium">{lead.subject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message Section - Full Width */}
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">
                      Message
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {lead.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
