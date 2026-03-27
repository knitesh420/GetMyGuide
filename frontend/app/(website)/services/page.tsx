"use client";

import { Compass, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import TourCard from "./_components/TourCard";
import TourForm from "./_components/TourForm";
import type { TourData } from "./types/tour";
import { getServicesAction } from "./actions";
import { useSelector } from "react-redux";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ServicesPage() {
  const [packages, setPackages] = useState<TourData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const { user, token } = useSelector((state: any) => state.auth);
  const admin = user?.role === "admin";

  // Ensure component only renders after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch existing packages on mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const services = await getServicesAction();

        // 🔒 Safety: ensure array
        if (Array.isArray(services)) {
          setPackages(services);
        } else {
          setPackages([]);
        }
      } catch (error) {
        console.error("Failed to fetch packages", error);
        setError("Failed to load packages. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);
  const handleSubmit = async (packageData: TourData): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("title", packageData.title);
      formData.append("city", packageData.city);
      formData.append("places", JSON.stringify(packageData.places));

      // Append image files
      packageData.images.forEach((img) => {
        if (img instanceof File) {
          formData.append("images", img);
        }
      });

      const res = await fetch(`${API_BASE_URL}/package`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.error?.message || "Failed to create package.");
        return false;
      }

      const created = data.data;

      setPackages((prev) => [
        {
          id: created.id, // Backend already provides id field
          title: created.title,
          city: created.city,
          places: created.places,
          images: created.images.map(
            (img: string) => `${API_BASE_URL}/media/packages/${img}`,
          ),
          featured: created.featured,
          status: created.status,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        ...prev,
      ]);

      alert("Package created successfully!");
      return true;
    } catch (error) {
      console.error("Failed to create package", error);
      alert("An error occurred while creating the package.");
      return false;
    }
  };

  const handleDelete = async (packageId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this package?",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/package/${packageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const responseText = await res.text();

      if (!res.ok) {
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          data = {
            error: { message: responseText || "Failed to delete package" },
          };
        }
        alert(data?.error?.message || "Failed to delete package");
        return;
      }

      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));
      alert("Package deleted successfully!");
    } catch (error) {
      console.error("Failed to delete package", error);
      alert("An error occurred while deleting the package.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 mt-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-pink-600 flex items-center justify-center">
              <Compass className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Tour Packages
              </h1>
              <p className="text-sm text-slate-600">
                Create and manage tour packages
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Tour Form */}
        <div className="mb-16">
          {mounted && admin && <TourForm onSubmit={handleSubmit} />}
        </div>

        {/* Packages Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-800">
              Available Packages
            </h2>
            <span className="px-4 py-2 bg-white rounded-full text-slate-600 font-semibold shadow-sm">
              {packages.length} {packages.length === 1 ? "Package" : "Packages"}
            </span>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Loading packages...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
              <Compass className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">
                No packages yet. Create your first package above!
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg, index) => (
                  <div key={pkg.id || index} className="relative">
                    <TourCard
                      title={pkg.title}
                      city={pkg.city}
                      images={pkg.images}
                      places={pkg.places}
                    />

                    {admin && (
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all z-10"
                        title="Delete package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
