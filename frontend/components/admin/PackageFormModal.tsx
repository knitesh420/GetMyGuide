// src/components/admin/PackageFormModal.tsx
"use client";
import React, { useState, useEffect, FormEvent, useRef } from "react";
import { AdminPackage, AdminLocation } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Trash2, RefreshCw, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type LanguageCode = "en" | "es" | "fr" | "ru" | "de";

interface TranslationFormState {
  title: string;
  city: string;
  places: string;
  shortDescription: string;
  description: string;
  inclusions: string;
  exclusions: string;
}

interface PackageFormData {
  title: string;
  description: string;
  price: number;
  basePrice: number;
  baseCurrency: string;
  duration: string;
  locations: string[]; // This will now store placeName strings
  images: (File | string)[];
  isActive: boolean;
  isFeatured: boolean;
}

interface PackageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  editingPackage: AdminPackage | null;
  isLoading: boolean;
  allLocations: AdminLocation[];
}

export function PackageFormModal({
  isOpen,
  onClose,
  onSave,
  editingPackage,
  isLoading,
  allLocations,
}: PackageFormModalProps) {
  const [formData, setFormData] = useState<PackageFormData>({
    title: "",
    description: "",
    price: 0,
    basePrice: 0,
    baseCurrency: "INR",
    duration: "",
    locations: [],
    images: [],
    isActive: true,
    isFeatured: false,
  });

  const [currentLang, setCurrentLang] = useState<LanguageCode>("en");
  const [translations, setTranslations] = useState<
    Record<LanguageCode, TranslationFormState>
  >({
    en: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
    },
    es: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
    },
    fr: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
    },
    ru: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
    },
    de: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
    },
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const defaultTranslationState = {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
    };

    if (editingPackage) {
      setFormData({
        title: editingPackage.title,
        description: editingPackage.description,
        price: editingPackage.price ?? 0,
        basePrice: editingPackage.basePrice ?? 0,
        baseCurrency: editingPackage.baseCurrency ?? "INR",
        duration: editingPackage.duration,
        isActive: editingPackage.isActive,
        isFeatured: editingPackage.isFeatured || false,
        locations: editingPackage.locations || [], // This is already an array of names, which is correct
        images: editingPackage.images || [],
      });

      const mergeTranslation = (lang: LanguageCode) => ({
        ...defaultTranslationState,
        ...(editingPackage.translations?.[lang] ?? {}),
        ...(lang === "en"
          ? {
              description:
                editingPackage.translations?.en?.description ??
                editingPackage.description ??
                "",
              shortDescription:
                editingPackage.translations?.en?.shortDescription ??
                editingPackage.shortDescription ??
                "",
            }
          : {}),
      });

      setTranslations({
        en: mergeTranslation("en"),
        es: mergeTranslation("es"),
        fr: mergeTranslation("fr"),
        ru: mergeTranslation("ru"),
        de: mergeTranslation("de"),
      });
    } else {
      setFormData({
        title: "",
        description: "",
        price: 0,
        basePrice: 0,
        baseCurrency: "INR",
        duration: "",
        locations: [],
        images: [],
        isActive: true,
        isFeatured: false,
      });
      setTranslations({
        en: defaultTranslationState,
        es: defaultTranslationState,
        fr: defaultTranslationState,
        ru: defaultTranslationState,
        de: defaultTranslationState,
      });
    }
  }, [editingPackage, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizeTranslationPlaces = (rawValue: string) =>
    rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const buildTranslations = () => {
    return (Object.keys(translations) as LanguageCode[]).reduce(
      (acc, lang) => {
        const value = translations[lang];
        const hasContent =
          value.title.trim() ||
          value.city.trim() ||
          value.places.trim() ||
          value.shortDescription.trim() ||
          value.description.trim() ||
          value.inclusions.trim() ||
          value.exclusions.trim();

        if (!hasContent) return acc;

        acc[lang] = {
          title: value.title.trim(),
          city: value.city.trim(),
          places: normalizeTranslationPlaces(value.places),
          shortDescription: value.shortDescription.trim(),
          description: value.description.trim(),
          inclusions: normalizeTranslationPlaces(value.inclusions),
          exclusions: normalizeTranslationPlaces(value.exclusions),
        };

        return acc;
      },
      {} as Record<LanguageCode, any>,
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formDataToSend = new FormData();

    // Append all form data as before
    formDataToSend.append("title", formData.title);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price", formData.price.toString());
    formDataToSend.append("basePrice", formData.basePrice.toString());
    formDataToSend.append("baseCurrency", formData.baseCurrency);
    formDataToSend.append("duration", formData.duration);
    formDataToSend.append("isActive", formData.isActive.toString());
    formDataToSend.append("isFeatured", formData.isFeatured.toString());
    formDataToSend.append("translations", JSON.stringify(buildTranslations()));

    // Now this correctly appends the location NAMES
    formData.locations.forEach((locName) => {
      formDataToSend.append("locations", locName);
    });

    const newImageFiles = formData.images.filter(
      (img) => img instanceof File,
    ) as File[];
    const existingImageUrls = formData.images.filter(
      (img) => typeof img === "string",
    ) as string[];

    newImageFiles.forEach((file) => {
      formDataToSend.append("images", file);
    });

    if (editingPackage) {
      existingImageUrls.forEach((url) => {
        formDataToSend.append("existingImages", url);
      });
    }

    await onSave(formDataToSend);
  };

  // <-- FIX #1: This function now works with the location NAME (string)
  const handleSelectLocation = (locationName: string) => {
    setFormData((prev) => {
      const newLocations = prev.locations.includes(locationName)
        ? prev.locations.filter((name) => name !== locationName)
        : [...prev.locations, locationName];
      return { ...prev, locations: newLocations };
    });
  };

  // <-- FIX #2: This function now removes by NAME (string)
  const removeLocation = (locationName: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((name) => name !== locationName),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...Array.from(e.target.files!)],
      }));
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));
  };

  const filteredLocations = allLocations.filter((location) =>
    location.placeName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // <-- FIX #3: Get selected location objects by matching their placeName
  const selectedLocations = allLocations.filter((loc) =>
    formData.locations.includes(loc.placeName),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b shrink-0">
          <CardTitle className="text-2xl">
            {editingPackage ? "Edit Package" : "Create New Package"}
          </CardTitle>
          <CardDescription>
            Fill in all the details for the tour package.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <CardContent className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-slate-700">
                  Translation language:
                </span>
                {["en", "es", "fr", "ru", "de"].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCurrentLang(lang as LanguageCode)}
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
              <div className="grid md:grid-cols-2 gap-6 p-4 rounded-3xl bg-slate-50 border border-slate-200">
                <div className="space-y-2">
                  <Label htmlFor="translationTitle">
                    Title ({currentLang.toUpperCase()})
                  </Label>
                  <Input
                    id="translationTitle"
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="translationCity">
                    City ({currentLang.toUpperCase()})
                  </Label>
                  <Input
                    id="translationCity"
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
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="translationPlaces">
                    Places ({currentLang.toUpperCase()})
                  </Label>
                  <Input
                    id="translationPlaces"
                    value={translations[currentLang].places}
                    placeholder="Comma-separated translated places"
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [currentLang]: {
                          ...prev[currentLang],
                          places: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="translationShortDescription">
                    Short Description ({currentLang.toUpperCase()})
                  </Label>
                  <Textarea
                    id="translationShortDescription"
                    rows={2}
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
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="translationDescription">
                    Description ({currentLang.toUpperCase()})
                  </Label>
                  <RichTextEditor
                    content={translations[currentLang].description ?? ""}
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
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="translationInclusions">
                    Inclusions ({currentLang.toUpperCase()})
                  </Label>
                  <Input
                    id="translationInclusions"
                    value={translations[currentLang].inclusions}
                    placeholder="Comma-separated included items"
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [currentLang]: {
                          ...prev[currentLang],
                          inclusions: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="translationExclusions">
                    Exclusions ({currentLang.toUpperCase()})
                  </Label>
                  <Input
                    id="translationExclusions"
                    value={translations[currentLang].exclusions}
                    placeholder="Comma-separated excluded items"
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [currentLang]: {
                          ...prev[currentLang],
                          exclusions: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  required
                  placeholder="e.g., 7 Days"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (₹) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  required
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseCurrency">Base Currency</Label>
                <Input
                  id="baseCurrency"
                  value={formData.baseCurrency}
                  onChange={(e) =>
                    setFormData({ ...formData, baseCurrency: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Location Multi-Select Dropdown */}
            <div className="space-y-2">
              <Label className="font-semibold">Locations *</Label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 border rounded-md bg-background hover:bg-accent transition-colors",
                    isDropdownOpen && "ring-2 ring-ring",
                  )}
                >
                  <span className="text-sm text-muted-foreground">
                    {formData.locations.length === 0
                      ? "Select locations..."
                      : `${formData.locations.length} location${formData.locations.length > 1 ? "s" : ""} selected`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isDropdownOpen && "transform rotate-180",
                    )}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border rounded-md shadow-lg">
                    <div className="p-2 border-b">
                      <Input
                        type="text"
                        placeholder="Search locations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-50 overflow-y-auto p-2">
                      {filteredLocations.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No locations found
                        </div>
                      ) : (
                        filteredLocations.map((location) => {
                          // <-- FIX #4: Check if the placeName is in the locations array
                          const isSelected = formData.locations.includes(
                            location.placeName,
                          );
                          return (
                            <div
                              key={location._id}
                              // <-- FIX #5: Pass the placeName to the handler
                              onClick={() =>
                                handleSelectLocation(location.placeName)
                              }
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                                isSelected ? "bg-accent" : "hover:bg-accent/50",
                              )}
                            >
                              <div
                                className={cn(
                                  "w-4 h-4 border rounded flex items-center justify-center shrink-0",
                                  isSelected && "bg-primary border-primary",
                                )}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                )}
                              </div>
                              <span className="text-sm flex-1">
                                {location.placeName}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/50 rounded-md">
                  {selectedLocations.map((loc) => (
                    <Badge
                      key={loc._id}
                      variant="secondary"
                      className="pl-3 pr-1 py-1 flex items-center gap-1"
                    >
                      {loc.placeName}
                      <button
                        type="button"
                        // <-- FIX #6: Remove by placeName
                        onClick={() => removeLocation(loc.placeName)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Image Upload & Preview (Unchanged) */}
            <div className="space-y-3 p-4 border rounded-lg">
              <Label className="font-semibold">Images</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={
                        typeof img === "string" ? img : URL.createObjectURL(img)
                      }
                      alt={`Package preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2"
              />
            </div>

            {/* Checkboxes (Unchanged) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: !!checked })
                  }
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Make package active
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <Checkbox
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: !!checked })
                  }
                />
                <Label htmlFor="isFeatured" className="cursor-pointer">
                  Mark as "Featured"
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-4 border-t pt-6 bg-muted/50 shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading
                ? "Saving..."
                : editingPackage
                  ? "Update Package"
                  : "Create Package"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
