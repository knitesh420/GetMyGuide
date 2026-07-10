"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store";
import { guideImageUrl } from "@/lib/images";
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
  Upload,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import dynamic from "next/dynamic";
import { resolvePackageImageUrl } from "@/lib/utils";
import { AdminLocation } from "@/types/admin";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

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
  /** Present when this row is a real tourist account (vs. a guest-only booking
   *  group). Used to deactivate the actual account, not just a booking. */
  accountId?: string;
  isActive?: boolean;
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

type LanguageCode = "en" | "es" | "fr" | "ru" | "de";

type PackageImage =
  | string
  | {
      url?: string;
      secure_url?: string;
      path?: string;
      publicId?: string;
    };

interface TranslationFields {
  title?: string;
  city?: string;
  places?: string[];
  shortDescription?: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
}

interface ServicePackage {
  id: string;
  title: string;
  city: string;
  places: string[];
  images: PackageImage[];
  status: "active" | "inactive" | string;
  createdAt: string;
  shortDescription?: string;
  description?: string;
  price?: number;
  numberOfPeople?: number;
  numberOfDays?: number;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
  featured?: boolean;
  translations?: Partial<Record<LanguageCode, TranslationFields>>;
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

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: "booking" | "guide_membership" | "trip_completion" | string;
  invoiceDate: string;
  paymentDate: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  customerSnapshot: {
    name: string;
    email: string;
    phone: string;
    country?: string;
  };
  paymentInfo: {
    amount: number;
    grandTotal: number;
    status: string;
    currency: string;
  };
  status: string;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [loadingGuideDetails, setLoadingGuideDetails] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(
    null,
  );
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const mapPackageForAdmin = (pkg: any): ServicePackage => {
    const en = pkg?.translations?.en ?? {};
    const fallbackPlaces = Array.isArray(en.places) ? en.places : [];
    const fallbackInclusions = Array.isArray(en.inclusions)
      ? en.inclusions
      : [];
    const fallbackExclusions = Array.isArray(en.exclusions)
      ? en.exclusions
      : [];
    const fallbackHighlights = Array.isArray(en.highlights)
      ? en.highlights
      : [];

    return {
      ...pkg,
      id: pkg?._id || pkg?.id,
      title: pkg?.title || en.title || "",
      city: pkg?.city || en.city || "",
      places:
        Array.isArray(pkg?.places) && pkg.places.length
          ? pkg.places
          : fallbackPlaces,
      images: Array.isArray(pkg?.images) ? pkg.images : [],
      status: pkg?.status || "active",
      createdAt: pkg?.createdAt || new Date().toISOString(),
      shortDescription: pkg?.shortDescription || en.shortDescription || "",
      description: pkg?.description || en.description || "",
      inclusions:
        Array.isArray(pkg?.inclusions) && pkg.inclusions.length
          ? pkg.inclusions
          : fallbackInclusions,
      exclusions:
        Array.isArray(pkg?.exclusions) && pkg.exclusions.length
          ? pkg.exclusions
          : fallbackExclusions,
      highlights:
        Array.isArray(pkg?.highlights) && pkg.highlights.length
          ? pkg.highlights
          : fallbackHighlights,
      featured: pkg?.featured ?? false,
    };
  };

  const handleDeleteGuide = async (guideId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this guide? This action can be undone by reactivating in the DB.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/guide/enrollment/${guideId}`, {
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

  const handleDeleteTouristBooking = async (bookingId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this tourist's booking? This action cannot be undone.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/booking/${bookingId}`, {
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
        alert(`Failed to delete booking: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      // Remove tourist from UI list
      setTourists((prev) => prev.filter((t) => t.id !== bookingId));
      alert(data?.message || "Booking deleted successfully");
    } catch (err) {
      console.error("Error deleting booking:", err);
      alert("Error deleting booking");
    } finally {
      setLoading(false);
    }
  };

  // Deactivate (soft-delete) a real tourist account. Distinct from deleting a
  // single booking above — this removes access for the whole account.
  const handleDeleteTouristAccount = async (accountId: string) => {
    if (
      !confirm(
        "Are you sure you want to deactivate this tourist account? They will lose access until reactivated.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user/${accountId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Deactivate failed:", res.status, txt);
        alert(
          `Failed to deactivate account: ${res.status} ${res.statusText}`,
        );
        return;
      }

      const data = await res.json();
      // Reflect the deactivation in the list without dropping the row, so the
      // admin can still see the (now inactive) account and its history.
      setTourists((prev) =>
        prev.map((t) =>
          t.accountId === accountId
            ? { ...t, isActive: false, status: "inactive" }
            : t,
        ),
      );
      alert(data?.message || "Tourist account deactivated successfully");
    } catch (err) {
      console.error("Error deactivating account:", err);
      alert("Error deactivating account");
    } finally {
      setLoading(false);
    }
  };

  // Reactivate a previously deactivated tourist account — inverse of the
  // deactivate action above, so an admin can restore access.
  const handleActivateTouristAccount = async (accountId: string) => {
    if (
      !confirm(
        "Are you sure you want to activate this tourist account? They will regain access.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user/${accountId}/activate`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Activate failed:", res.status, txt);
        alert(`Failed to activate account: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      setTourists((prev) =>
        prev.map((t) =>
          t.accountId === accountId
            ? { ...t, isActive: true, status: "active" }
            : t,
        ),
      );
      alert(data?.message || "Tourist account activated successfully");
    } catch (err) {
      console.error("Error activating account:", err);
      alert("Error activating account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this contact inquiry? This action cannot be undone.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/lead/contact/${leadId}`, {
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
        alert(
          `Failed to delete contact inquiry: ${res.status} ${res.statusText}`,
        );
        return;
      }

      const data = await res.json();
      // Remove lead from UI list
      setLeads((prev) => prev.filter((l) => l._id !== leadId));
      alert(data?.message || "Contact inquiry deleted successfully");
    } catch (err) {
      console.error("Error deleting contact inquiry:", err);
      alert("Error deleting contact inquiry");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this service? This action cannot be undone.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/package/${packageId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Delete failed:", res.status, txt);
        alert(`Failed to delete service: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      setPackages((prev) => prev.filter((p) => p.id !== packageId));
      alert(
        data?.data?.message || data?.message || "Service deleted successfully",
      );
    } catch (err) {
      console.error("Error deleting service:", err);
      alert("Error deleting service");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePackage = async (
    packageId: string,
    updates: {
      title?: string;
      city?: string;
      places?: string[];
      shortDescription?: string;
      description?: string;
      price?: number;
      numberOfPeople?: number;
      numberOfDays?: number;
      inclusions?: string[];
      exclusions?: string[];
      translations?: Partial<Record<LanguageCode, TranslationFields>>;
      featured?: boolean;
      status?: "active" | "inactive";
      images?: File[];
    },
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (updates.title !== undefined) formData.append("title", updates.title);
      if (updates.city !== undefined) formData.append("city", updates.city);
      if (updates.places !== undefined)
        formData.append("places", JSON.stringify(updates.places));
      if (updates.shortDescription !== undefined)
        formData.append("shortDescription", updates.shortDescription);
      if (updates.description !== undefined)
        formData.append("description", updates.description);
      if (updates.price !== undefined)
        formData.append("price", String(updates.price));
      if (updates.numberOfPeople !== undefined)
        formData.append("numberOfPeople", String(updates.numberOfPeople));
      if (updates.numberOfDays !== undefined)
        formData.append("numberOfDays", String(updates.numberOfDays));
      if (updates.inclusions !== undefined)
        formData.append("inclusions", JSON.stringify(updates.inclusions));
      if (updates.exclusions !== undefined)
        formData.append("exclusions", JSON.stringify(updates.exclusions));
      if (updates.translations !== undefined)
        formData.append("translations", JSON.stringify(updates.translations));
      if (updates.featured !== undefined)
        formData.append("featured", String(updates.featured));
      if (updates.status !== undefined)
        formData.append("status", updates.status);
      if (updates.images && updates.images.length > 0) {
        for (const file of updates.images) {
          formData.append("images", file);
        }
      }

      const res = await fetch(`${API_BASE}/package/${packageId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Update failed:", res.status, txt);
        alert(`Failed to update service: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      const updated = data?.data ?? data;
      const mappedUpdated = mapPackageForAdmin(updated);
      setPackages((prev) =>
        prev.map((p) =>
          p.id === packageId ? { ...p, ...updates, ...mappedUpdated } : p,
        ),
      );
      setEditingPackage(null);
      alert("Service updated successfully");
    } catch (err) {
      console.error("Error updating service:", err);
      alert("Error updating service");
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
      id: "services",
      label: "Services",
      icon: Package,
    },
    {
      id: "advertisements",
      label: "Advertisements",
      icon: Film,
    },
    {
      id: "payments",
      label: "Payments",
      icon: Receipt,
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

  // Fetch locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_BASE}/location`, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setLocations(data.data || data.locations || []);
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };
    if (token) {
      fetchLocations();
    }
  }, [token, API_BASE]);

  // Don't render anything if not authenticated or not admin
  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const fetchGuideById = async (id: string) => {
    setLoadingGuideDetails(true);
    try {
      const response = await fetch(`${API_BASE}/guide/enroll-status/${id}`, {
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
          const guidesRes = await fetch(`${API_BASE}/guide/list-all`, {
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

        case "tourists": {
          // Show every registered tourist account (even those who never booked)
          // AND every guest booking. Start from accounts, then fold bookings in.
          const touristMap = new Map<string, Tourist>();

          // 1) All tourist accounts
          try {
            const accountsRes = await fetch(
              `${API_BASE}/user/tourists?limit=1000`,
              {
                credentials: "include",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );
            if (accountsRes.ok) {
              const accountsData = await accountsRes.json();
              const accounts =
                accountsData.data?.tourists || accountsData.tourists || [];
              accounts.forEach((acc: any) => {
                touristMap.set(acc.email, {
                  id: acc._id,
                  accountId: acc._id,
                  isActive: acc.isActive,
                  name: acc.name,
                  email: acc.email,
                  phone: acc.phone || "",
                  country: "",
                  gender: "",
                  role: acc.role || "tourist",
                  status:
                    acc.isActive === false
                      ? "inactive"
                      : acc.status || "active",
                  createdAt: acc.createdAt,
                  bookingCount: 0,
                  totalSpent: 0,
                  lastBookingDate: acc.createdAt,
                  cities: [],
                  bookings: [],
                  services: [],
                });
              });
            }
          } catch (err) {
            console.error("Error fetching tourist accounts:", err);
          }

          // 2) All bookings — attach to the matching account, or add a guest row
          const touristBookingsRes = await fetch(`${API_BASE}/booking`, {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (touristBookingsRes.ok) {
            const touristBookingsData = await touristBookingsRes.json();
            const touristBookingsArray =
              touristBookingsData.bookings ||
              touristBookingsData.data?.bookings ||
              [];

            touristBookingsArray.forEach((booking: Booking) => {
              const email = booking.tourist_info.email;
              const service = {
                city: booking.travel_details.city,
                places: booking.travel_details.places,
                duration: booking.booking_configuration.duration,
                price: booking.booking_configuration.price,
                date: booking.travel_details.date,
                preferences: booking.travel_details.preferences,
              };
              const existing = touristMap.get(email);

              if (!existing) {
                // Guest booking with no matching account
                touristMap.set(email, {
                  id: booking.id,
                  name: booking.tourist_info.name,
                  email,
                  phone: booking.tourist_info.phone,
                  country: booking.tourist_info.country,
                  gender: booking.tourist_info.gender,
                  role: "guest",
                  status: booking.status,
                  createdAt: booking.createdAt,
                  bookingCount: 1,
                  totalSpent: booking.booking_configuration.price,
                  lastBookingDate: booking.createdAt,
                  cities: [booking.travel_details.city],
                  bookings: [booking],
                  services: [service],
                });
              } else {
                existing.bookingCount += 1;
                existing.totalSpent += booking.booking_configuration.price;
                if (!existing.country)
                  existing.country = booking.tourist_info.country;
                if (!existing.gender)
                  existing.gender = booking.tourist_info.gender;
                if (!existing.phone)
                  existing.phone = booking.tourist_info.phone;
                if (
                  new Date(booking.createdAt) >
                  new Date(existing.lastBookingDate)
                ) {
                  existing.lastBookingDate = booking.createdAt;
                }
                if (!existing.cities.includes(booking.travel_details.city)) {
                  existing.cities.push(booking.travel_details.city);
                }
                existing.bookings.push(booking);
                existing.services.push(service);
              }
            });
          } else {
            console.error(
              "Failed to fetch tourist bookings:",
              touristBookingsRes.status,
              touristBookingsRes.statusText,
            );
          }

          setTourists(Array.from(touristMap.values()));
          break;
        }

        case "bookings":
          try {
            const leadsRes = await fetch(`${API_BASE}/lead/contact`, {
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

        case "services":
          try {
            const pkgRes = await fetch(`${API_BASE}/package`, {
              credentials: "include",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (pkgRes.ok) {
              const pkgData = await pkgRes.json();
              const pkgArray = pkgData.data || pkgData.packages || [];
              const mapped = pkgArray.map(mapPackageForAdmin);
              setPackages(mapped);
            } else {
              const errorText = await pkgRes.text();
              console.error(
                "Failed to fetch services:",
                pkgRes.status,
                errorText,
              );
              alert(`Failed to fetch services: ${pkgRes.status}`);
              setPackages([]);
            }
          } catch (error) {
            console.error("Error fetching services:", error);
            alert(`Error fetching services: ${error}`);
            setPackages([]);
          }
          break;

        case "advertisements":
          try {
            const adsRes = await fetch(`${API_BASE}/advertisement/admin/all`, {
              credentials: "include",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (adsRes.ok) {
              const adsData = await adsRes.json();

              // Handle all response structures:
              // New format: { data: [...], success: true }
              // Old format: { "0": {...}, "1": {...}, success: true } (spread array)
              let adsArray: Advertisement[] = [];
              if (Array.isArray(adsData.data)) {
                adsArray = adsData.data;
              } else if (Array.isArray(adsData)) {
                adsArray = adsData;
              } else {
                // Old spread format: extract numeric keys
                const items = Object.keys(adsData)
                  .filter((key) => !isNaN(Number(key)))
                  .sort((a, b) => Number(a) - Number(b))
                  .map((key) => adsData[key]);
                if (items.length > 0) {
                  adsArray = items;
                }
              }
              setAdvertisements(adsArray);
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

        case "payments":
          try {
            // Admins get every invoice from this endpoint (see backend
            // buildQuery). High limit so the ledger isn't paginated away.
            const invRes = await fetch(`${API_BASE}/invoice?limit=1000`, {
              credentials: "include",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (invRes.ok) {
              const invBody = await invRes.json();
              const payload = invBody.data ?? invBody;
              const list = Array.isArray(payload)
                ? payload
                : payload.data || payload.invoices || [];
              setInvoices(list);
            } else {
              const errorText = await invRes.text();
              console.error(
                "Failed to fetch payments:",
                invRes.status,
                invRes.statusText,
                errorText,
              );
              setInvoices([]);
            }
          } catch (error) {
            console.error("Error fetching payments:", error);
            setInvoices([]);
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
                    {activeTab === "services" && packages.length}
                    {activeTab === "advertisements" && advertisements.length}
                    {activeTab === "payments" && invoices.length}
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
                {tourists.length > 0 && (
                  <TouristsTable
                    tourists={tourists}
                    onDelete={handleDeleteTouristBooking}
                    onDeleteAccount={handleDeleteTouristAccount}
                    onActivateAccount={handleActivateTouristAccount}
                  />
                )}
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
                {leads.length > 0 && (
                  <LeadsTable leads={leads} onDelete={handleDeleteLead} />
                )}
              </>
            )}
            {activeTab === "services" && (
              <>
                {packages.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No services found.</p>
                  </div>
                )}
                {packages.length > 0 && (
                  <ServicesTable
                    packages={packages}
                    onEdit={setEditingPackage}
                    onDelete={handleDeletePackage}
                  />
                )}
              </>
            )}
            {activeTab === "advertisements" && (
              <AdvertisementsSection
                advertisements={advertisements}
                setAdvertisements={setAdvertisements}
                loading={loading}
                token={token}
                apiBase={API_BASE}
                onRefresh={() => fetchData("advertisements")}
              />
            )}
            {activeTab === "payments" && (
              <>
                {invoices.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No payments found.</p>
                  </div>
                )}
                {invoices.length > 0 && (
                  <PaymentsTable
                    invoices={invoices}
                    token={token}
                    apiBase={API_BASE}
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

      {/* Edit Service Modal */}
      {editingPackage && (
        <EditServiceModal
          pkg={editingPackage}
          loading={loading}
          onClose={() => setEditingPackage(null)}
          onSave={(updates) => handleUpdatePackage(editingPackage.id, updates)}
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
                      src={guideImageUrl(guide.photo) ?? undefined}
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
                          src={guideImageUrl(guide.photo) ?? undefined}
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
function TouristsTable({
  tourists,
  onDelete,
  onDeleteAccount,
  onActivateAccount,
}: {
  tourists: Tourist[];
  onDelete: (id: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onActivateAccount: (accountId: string) => void;
}) {
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

                {/* Actions: deactivate a real account, or delete a guest booking */}
                <div className="mt-4 flex justify-end">
                  {tourist.accountId ? (
                    tourist.isActive === false ? (
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                          Account Deactivated
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onActivateAccount(tourist.accountId!);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                        >
                          <ToggleRight className="w-4 h-4" />
                          Activate Account
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAccount(tourist.accountId!);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Deactivate Account
                      </button>
                    )
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(tourist.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Booking
                    </button>
                  )}
                </div>
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
function ServicesTable({
  packages,
  onEdit,
  onDelete,
}: {
  packages: ServicePackage[];
  onEdit: (pkg: ServicePackage) => void;
  onDelete: (id: string) => void;
}) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {packages.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                No services found
              </td>
            </tr>
          ) : (
            packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {pkg.images.length > 0 && (
                    <img
                      src={resolvePackageImageUrl(pkg.images[0])}
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
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(pkg)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit service"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(pkg.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Edit Service Modal Component
function EditServiceModal({
  pkg,
  loading,
  onClose,
  onSave,
}: {
  pkg: ServicePackage;
  loading: boolean;
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    city?: string;
    places?: string[];
    shortDescription?: string;
    description?: string;
    inclusions?: string[];
    exclusions?: string[];
    price?: number;
    numberOfPeople?: number;
    numberOfDays?: number;
    featured?: boolean;
    status?: "active" | "inactive";
    images?: File[];
    translations?: Partial<Record<LanguageCode, TranslationFields>>;
  }) => void;
}) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const supportedLanguages: LanguageCode[] = ["en", "es", "fr", "ru", "de"];
  const translationLanguages: LanguageCode[] = supportedLanguages;

  interface TranslationFormState {
    title: string;
    city: string;
    places: string;
    shortDescription: string;
    description: string;
    inclusions: string;
    exclusions: string;
    highlights: string;
  }

  const createTranslationState = (): TranslationFormState => ({
    title: "",
    city: "",
    places: "",
    shortDescription: "",
    description: "",
    inclusions: "",
    exclusions: "",
    highlights: "",
  });

  const [currentLang, setCurrentLang] = useState<LanguageCode>("en");
  const [translations, setTranslations] = useState<
    Record<LanguageCode, TranslationFormState>
  >({
    en: createTranslationState(),
    es: createTranslationState(),
    fr: createTranslationState(),
    ru: createTranslationState(),
    de: createTranslationState(),
  });

  const [price, setPrice] = useState<string>(
    pkg.price !== undefined ? String(pkg.price) : "",
  );
  const [numberOfPeople, setNumberOfPeople] = useState<string>(
    pkg.numberOfPeople !== undefined ? String(pkg.numberOfPeople) : "",
  );
  const [numberOfDays, setNumberOfDays] = useState<string>(
    pkg.numberOfDays !== undefined ? String(pkg.numberOfDays) : "",
  );
  const [featured, setFeatured] = useState<boolean>(pkg.featured ?? false);
  const [status, setStatus] = useState<"active" | "inactive">(
    pkg.status === "inactive" ? "inactive" : "active",
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    const mergeTranslation = (lang: LanguageCode): TranslationFormState => ({
      title:
        pkg.translations?.[lang]?.title ?? (lang === "en" ? pkg.title : ""),
      city: pkg.translations?.[lang]?.city ?? (lang === "en" ? pkg.city : ""),
      places: (
        pkg.translations?.[lang]?.places ?? (lang === "en" ? pkg.places : [])
      ).join(", "),
      shortDescription:
        pkg.translations?.[lang]?.shortDescription ??
        (lang === "en" ? (pkg.shortDescription ?? "") : ""),
      description:
        pkg.translations?.[lang]?.description ??
        (lang === "en" ? (pkg.description ?? "") : ""),
      inclusions: (
        pkg.translations?.[lang]?.inclusions ??
        (lang === "en" ? (pkg.inclusions ?? []) : [])
      ).join("\n"),
      exclusions: (
        pkg.translations?.[lang]?.exclusions ??
        (lang === "en" ? (pkg.exclusions ?? []) : [])
      ).join("\n"),
      highlights: (pkg.translations?.[lang]?.highlights ?? []).join("\n"),
    });

    setTranslations({
      en: mergeTranslation("en"),
      es: mergeTranslation("es"),
      fr: mergeTranslation("fr"),
      ru: mergeTranslation("ru"),
      de: mergeTranslation("de"),
    });
  }, [pkg]);

  const normalizeTranslationPlaces = (rawValue: string) =>
    rawValue
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  const buildTranslations = () =>
    supportedLanguages.reduce(
      (acc, lang) => {
        const values = translations[lang];

        const hasContent =
          values.title.trim() ||
          values.city.trim() ||
          values.places.trim() ||
          values.shortDescription.trim() ||
          values.description.trim() ||
          values.inclusions.trim() ||
          values.exclusions.trim() ||
          values.highlights.trim();

        if (!hasContent) return acc;

        const normalized = {
          title: values.title.trim(),
          city: values.city.trim(),
          places: normalizeTranslationPlaces(values.places),
          shortDescription: values.shortDescription.trim(),
          description: values.description.trim(),
          inclusions: normalizeTranslationPlaces(values.inclusions),
          exclusions: normalizeTranslationPlaces(values.exclusions),
          highlights: normalizeTranslationPlaces(values.highlights),
        };

        const isComplete =
          normalized.title &&
          normalized.city &&
          normalized.shortDescription &&
          normalized.description &&
          normalized.places.length &&
          normalized.inclusions.length &&
          normalized.exclusions.length &&
          normalized.highlights.length;

        if (lang !== "en" && !isComplete) {
          alert(
            `${lang.toUpperCase()} translation has some fields filled but is incomplete — it will not be saved. Please fill all fields or clear them entirely.`,
          );
          return acc;
        }

        acc[lang] = normalized;

        return acc;
      },
      {} as Partial<Record<LanguageCode, TranslationFields>>,
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const translationPayload = buildTranslations();
    const english = translationPayload.en;
    // Strip HTML tags to check if description has actual visible text
    const descriptionText = english?.description?.replace(/<[^>]*>/g, "").trim() ?? "";
    if (
      !english?.title ||
      !english?.city ||
      !english?.shortDescription ||
      !descriptionText ||
      !english?.places?.length ||
      !english?.inclusions?.length ||
      !english?.exclusions?.length ||
      !english?.highlights?.length
    ) {
      alert(
        "English translation requires title, city, places, highlights, short description, description, inclusions, and exclusions.",
      );
      return;
    }

    if (imageFiles.length > 0) {
      const ok = confirm(
        `Uploading ${imageFiles.length} new image(s) will REPLACE all existing images. Continue?`,
      );
      if (!ok) return;
    }

    onSave({
      price: price !== "" ? Number(price) : undefined,
      numberOfPeople:
        numberOfPeople !== "" ? Number(numberOfPeople) : undefined,
      numberOfDays: numberOfDays !== "" ? Number(numberOfDays) : undefined,
      featured,
      status,
      images: imageFiles.length > 0 ? imageFiles : undefined,
      translations: translationPayload,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Edit Service</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XCircle className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-slate-700">
                Translation language:
              </span>
              {translationLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setCurrentLang(lang)}
                  className={`px-3 py-2 rounded-full border ${
                    currentLang === lang
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title ({currentLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={translations[currentLang].title}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        title: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 focus:border-blue-400 focus:bg-blue-50/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  City ({currentLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={translations[currentLang].city}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        city: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 focus:border-blue-400 focus:bg-blue-50/30 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Places ({currentLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={translations[currentLang].places}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        places: e.target.value,
                      },
                    }))
                  }
                  placeholder="Comma-separated translated places"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 focus:border-blue-400 focus:bg-blue-50/30 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Highlights ({currentLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={translations[currentLang].highlights}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        highlights: e.target.value,
                      },
                    }))
                  }
                  placeholder="Comma-separated highlights"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 focus:border-blue-400 focus:bg-blue-50/30 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Short Description ({currentLang.toUpperCase()})
                </label>
                <textarea
                  value={translations[currentLang].shortDescription}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        shortDescription: e.target.value,
                      },
                    }))
                  }
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:border-blue-400 focus:bg-blue-50/30 resize-none"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description ({currentLang.toUpperCase()})
                </label>
                <RichTextEditor
                  content={translations[currentLang].description}
                  onChange={(html) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        description: html,
                      },
                    }))
                  }
                  placeholder="Write styled description for this locale"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Inclusions ({currentLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={translations[currentLang].inclusions}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        inclusions: e.target.value,
                      },
                    }))
                  }
                  placeholder="Comma-separated inclusions"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 focus:border-blue-400 focus:bg-blue-50/30 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Exclusions ({currentLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={translations[currentLang].exclusions}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [currentLang]: {
                        ...prev[currentLang],
                        exclusions: e.target.value,
                      },
                    }))
                  }
                  placeholder="Comma-separated exclusions"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 focus:border-blue-400 focus:bg-blue-50/30 outline-none"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                People
              </label>
              <input
                type="number"
                min="1"
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days
              </label>
              <input
                type="number"
                min="1"
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "inactive")
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Featured service
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images
            </label>
            {pkg.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pkg.images.map((img, idx) => (
                  <img
                    key={String(idx)}
                    src={resolvePackageImageUrl(img)}
                    alt=""
                    className="w-20 h-20 rounded object-cover border"
                  />
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={(e) =>
                setImageFiles(e.target.files ? Array.from(e.target.files) : [])
              }
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Selecting new images will REPLACE all existing images. Leave empty
              to keep current images.
            </p>
            {imageFiles.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                {imageFiles.length} new image(s) selected
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
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
                      src={guideImageUrl(guide.photo) ?? undefined}
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
function PaymentsTable({
  invoices,
  token,
  apiBase,
}: {
  invoices: Invoice[];
  token: string | null;
  apiBase: string;
}) {
  // Download a file from an authenticated endpoint (PDF invoice or CSV export).
  const downloadWithAuth = async (url: string, fallbackName: string) => {
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        alert(`Download failed: ${res.status} ${res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(href);
    } catch (err) {
      console.error("Download error:", err);
      alert("Could not download the file.");
    }
  };

  const typeLabel: Record<string, string> = {
    booking: "Booking",
    guide_membership: "Guide Membership",
    trip_completion: "Trip",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() =>
            downloadWithAuth(
              `${apiBase}/invoice/admin/export?format=csv`,
              "invoices.csv",
            )
          }
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Invoice
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Customer
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Payment ID
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                Invoice
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {invoices.map((inv) => (
              <tr key={inv._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {inv.invoiceNumber}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {typeLabel[inv.invoiceType] || inv.invoiceType}
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">
                    {inv.customerSnapshot?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {inv.customerSnapshot?.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-green-700">
                  {inv.paymentInfo?.currency || "INR"}{" "}
                  {(
                    inv.paymentInfo?.grandTotal ??
                    inv.paymentInfo?.amount ??
                    0
                  ).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      inv.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : inv.status === "refunded"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {inv.paymentDate
                    ? new Date(inv.paymentDate).toLocaleDateString()
                    : new Date(inv.invoiceDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {inv.razorpayPaymentId || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() =>
                      downloadWithAuth(
                        `${apiBase}/invoice/${inv._id}/download`,
                        `${inv.invoiceNumber}.pdf`,
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadsTable({
  leads,
  onDelete,
}: {
  leads: Lead[];
  onDelete: (id: string) => void;
}) {
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

                  {/* Delete Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(lead._id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
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

// Advertisements Section with upload, list, toggle, delete
function AdvertisementsSection({
  advertisements,
  setAdvertisements,
  loading,
  token,
  apiBase,
  onRefresh,
}: {
  advertisements: Advertisement[];
  setAdvertisements: React.Dispatch<React.SetStateAction<Advertisement[]>>;
  loading: boolean;
  token: string | null;
  apiBase: string;
  onRefresh: () => void;
}) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [failedVideoIds, setFailedVideoIds] = useState<Set<string>>(new Set());

  const PRODUCTION_API = "https://api.getmyguide.in";

  // Get the video URL — fallback to production if local file doesn't exist
  const getVideoUrl = (ad: Advertisement) => {
    const base = failedVideoIds.has(ad.id) ? PRODUCTION_API : apiBase;
    return `${base}/media/advertisements/${ad.videoFilename}`;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", selectedFile);
      if (uploadTitle.trim()) formData.append("title", uploadTitle.trim());

      const res = await fetch(`${apiBase}/advertisement`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setSelectedFile(null);
        setUploadTitle("");
        setShowUploadForm(false);
        setSuccessMsg("Advertisement uploaded successfully!");
        setTimeout(() => setSuccessMsg(null), 4000);
        onRefresh();
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.message || "Failed to upload advertisement");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload advertisement");
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${apiBase}/advertisement/${id}/toggle`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert("Failed to toggle advertisement status");
      }
    } catch {
      alert("Failed to toggle advertisement status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`${apiBase}/advertisement/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        setAdvertisements((prev) => prev.filter((ad) => ad.id !== id));
      } else {
        alert("Failed to delete advertisement");
      }
    } catch {
      alert("Failed to delete advertisement");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Button / Form */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Total advertisements: <strong>{advertisements.length}</strong>
        </p>
        {!showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload New Ad
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Upload New Advertisement
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Title
            </label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Enter advertisement title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-700 file:font-medium file:cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {selectedFile.name} (
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                setUploadTitle("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {advertisements.length === 0 && !loading && !showUploadForm && (
        <div className="text-center py-12">
          <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No advertisements found.</p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="text-blue-500 hover:text-blue-600 underline font-medium"
          >
            Create your first advertisement
          </button>
        </div>
      )}

      {/* Advertisements List */}
      {advertisements.length > 0 && (
        <div className="grid gap-4">
          {advertisements.map((ad) => (
            <div
              key={ad.id}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border transition-colors ${
                ad.isActive
                  ? "bg-white border-gray-200"
                  : "bg-gray-50 border-gray-200 opacity-70"
              }`}
            >
              {/* Video Player - fully playable */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <video
                  key={ad.id + ad.videoFilename}
                  src={`${getVideoUrl(ad)}#t=0.1`}
                  className="w-full aspect-video rounded-md bg-black"
                  controls
                  muted
                  preload="auto"
                  playsInline
                  onError={() => {
                    if (
                      !failedVideoIds.has(ad.id) &&
                      apiBase !== PRODUCTION_API
                    ) {
                      setFailedVideoIds((prev) => new Set(prev).add(ad.id));
                    }
                  }}
                />
              </div>

              {/* Ad Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-gray-800 truncate">
                  {ad.title || "Untitled Ad"}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                  {ad.videoFilename}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {ad.views} views
                  </span>
                  <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ad.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {ad.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(ad.id)}
                  disabled={actionLoading === ad.id}
                  className={`p-2 rounded-lg transition-colors ${
                    ad.isActive
                      ? "text-green-600 hover:bg-green-50"
                      : "text-gray-400 hover:bg-gray-100"
                  } disabled:opacity-50`}
                  title={ad.isActive ? "Deactivate" : "Activate"}
                >
                  {ad.isActive ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(ad.id)}
                  disabled={actionLoading === ad.id}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}