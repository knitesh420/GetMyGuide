"use client";

import { useState } from "react";
import { TourData } from "../types/tour";
import { X, Upload, MapPin } from "lucide-react";

interface Props {
  onSubmit: (data: TourData) => Promise<boolean>;
}

const MAX_IMAGES = 8;

export default function TourForm({ onSubmit }: Props) {
  const [form, setForm] = useState({
    title: "",
    city: "",
    places: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      e.currentTarget.value = "";
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setErrors({ ...errors, images: `Maximum ${MAX_IMAGES} images allowed` });
      e.currentTarget.value = "";
      return;
    }

    let acceptedFiles = files;
    if (files.length > remaining) {
      acceptedFiles = files.slice(0, remaining);
      setErrors({
        ...errors,
        images: `Only ${acceptedFiles.length} images were added to reach the maximum of ${MAX_IMAGES}`,
      });
    } else {
      setErrors({ ...errors, images: "" });
    }

    const newPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));

    setImages((prev) => [...prev, ...acceptedFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Clear input so same file can be selected again if needed
    e.currentTarget.value = "";
  };

  const removeImage = (index: number) => {
    // Revoke the preview URL for the removed image
    URL.revokeObjectURL(previews[index]);

    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setErrors({ ...errors, images: "" });
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.title.trim()) newErrors.title = "Package title is required";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.places.trim())
      newErrors.places = "At least one place is required";
    if (images.length === 0)
      newErrors.images = "At least one image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Parse places from comma-separated string
    const placesArray = form.places
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);

    const tourData: TourData = {
      id: Date.now().toString(),
      title: form.title,
      city: form.city,
      places: placesArray,
      images,
    };

    const ok = await onSubmit(tourData);
    if (!ok) return;

    // Reset form
    previews.forEach((url) => URL.revokeObjectURL(url));

    setForm({
      title: "",
      city: "",
      places: "",
    });
    setImages([]);
    setPreviews([]);
    setErrors({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl shadow-xl p-8 border-2 border-slate-100"
    >
      <h2 className="text-3xl font-bold mb-8 text-slate-800">Create Package</h2>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column - Form Fields */}
        <div className="space-y-6">
          {/* Package Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Package Title *
            </label>
            <input
              type="text"
              value={form.title}
              placeholder="Golden Triangle Tour"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                errors.title
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
              }`}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                setErrors({ ...errors, title: "" });
              }}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              City *
            </label>
            <input
              type="text"
              value={form.city}
              placeholder="Delhi"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                errors.city
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
              }`}
              onChange={(e) => {
                setForm({ ...form, city: e.target.value });
                setErrors({ ...errors, city: "" });
              }}
            />
            {errors.city && (
              <p className="text-red-500 text-xs mt-1">{errors.city}</p>
            )}
          </div>

          {/* Places */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Places (comma-separated) *
            </label>
            <input
              type="text"
              value={form.places}
              placeholder="Taj Mahal, Red Fort, Qutub Minar"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                errors.places
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
              }`}
              onChange={(e) => {
                setForm({ ...form, places: e.target.value });
                setErrors({ ...errors, places: "" });
              }}
            />
            {errors.places && (
              <p className="text-red-500 text-xs mt-1">{errors.places}</p>
            )}
          </div>
        </div>

        {/* Right Column - Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Upload className="inline w-4 h-4 mr-1" />
            Package Images * (Max {MAX_IMAGES})
          </label>

          <label
            className={`block w-full h-40 border-3 border-dashed rounded-2xl cursor-pointer transition-all hover:bg-blue-50 ${
              errors.images
                ? "border-red-300 bg-red-50"
                : "border-slate-300 hover:border-blue-400"
            }`}
          >
            <input
              type="file"
              multiple
              accept="image/png,image/webp,image/jpg,image/jpeg"
              className="hidden"
              onChange={handleImageChange}
            />
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Upload className="w-10 h-10 mb-2" />
              <p className="text-sm font-medium">Click to upload images</p>
              <p className="text-xs mt-1">PNG, JPG, WEBP</p>
            </div>
          </label>
          {errors.images && (
            <p className="text-red-500 text-xs mt-1">{errors.images}</p>
          )}

          {/* Image Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-orange-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-orange-700 hover:to-pink-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          Create Package
        </button>
      </div>
    </form>
  );
}
