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
import { RefreshCw, X, ChevronDown, Check } from "lucide-react";
import { cn, resolvePackageImageUrl } from "@/lib/utils";

type LanguageCode = "en" | "es" | "fr" | "ru" | "de";

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

interface PackageFormData {
  price: number;
  numberOfPeople: number;
  numberOfDays: number;
  locations: string[]; // This will now store placeName strings
  images: (File | string)[];
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
    price: 0,
    numberOfPeople: 1,
    numberOfDays: 1,
    locations: [],
    images: [],
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
      highlights: "",
    },
    es: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
      highlights: "",
    },
    fr: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
      highlights: "",
    },
    ru: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
      highlights: "",
    },
    de: {
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
      highlights: "",
    },
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createEmptyTranslation = (): TranslationFormState => ({
      title: "",
      city: "",
      places: "",
      shortDescription: "",
      description: "",
      inclusions: "",
      exclusions: "",
      highlights: "",
    });

    if (editingPackage) {
      setFormData({
        price: editingPackage.price ?? 0,
        numberOfPeople: editingPackage.numberOfPeople ?? 1,
        numberOfDays: editingPackage.numberOfDays ?? 1,
        isFeatured:
          editingPackage.featured ?? editingPackage.isFeatured ?? false,
        locations: editingPackage.locations || [], // This is already an array of names, which is correct
        images: (editingPackage.images || []).map((img) =>
          resolvePackageImageUrl(img),
        ),
      });

      // Load each language independently from database, don't copy English to other languages
      const loadTranslation = (lang: LanguageCode): TranslationFormState => {
        const dbTranslation = editingPackage.translations?.[lang];

        if (dbTranslation) {
          return {
            title: dbTranslation.title ?? "",
            city: dbTranslation.city ?? "",
            places: Array.isArray(dbTranslation.places)
              ? dbTranslation.places.join(", ")
              : "",
            shortDescription: dbTranslation.shortDescription ?? "",
            description: dbTranslation.description ?? "",
            inclusions: Array.isArray(dbTranslation.inclusions)
              ? dbTranslation.inclusions.join(", ")
              : "",
            exclusions: Array.isArray(dbTranslation.exclusions)
              ? dbTranslation.exclusions.join(", ")
              : "",
            highlights: Array.isArray(dbTranslation.highlights)
              ? dbTranslation.highlights.join(", ")
              : "",
          };
        }

        // If no database translation, return empty (don't use English as fallback for UI)
        return createEmptyTranslation();
      };

      setTranslations({
        en: loadTranslation("en"),
        es: loadTranslation("es"),
        fr: loadTranslation("fr"),
        ru: loadTranslation("ru"),
        de: loadTranslation("de"),
      });
    } else {
      setFormData({
        price: 0,
        numberOfPeople: 1,
        numberOfDays: 1,
        locations: [],
        images: [],
        isFeatured: false,
      });

      // For new packages, create independent empty translation states for each language
      const emptyTranslation = createEmptyTranslation();
      setTranslations({
        en: { ...emptyTranslation },
        es: { ...emptyTranslation },
        fr: { ...emptyTranslation },
        ru: { ...emptyTranslation },
        de: { ...emptyTranslation },
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
          value.exclusions.trim() ||
          value.highlights.trim();

        if (!hasContent) return acc;

        const normalized = {
          title: value.title.trim(),
          city: value.city.trim(),
          places: normalizeTranslationPlaces(value.places),
          shortDescription: value.shortDescription.trim(),
          description: value.description.trim(),
          inclusions: normalizeTranslationPlaces(value.inclusions),
          exclusions: normalizeTranslationPlaces(value.exclusions),
          highlights: normalizeTranslationPlaces(value.highlights),
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

        if (lang !== "en" && !isComplete) return acc;

        acc[lang] = normalized;

        return acc;
      },
      {} as Record<LanguageCode, any>,
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const translationsPayload = buildTranslations();
    const english = translationsPayload.en;
    if (
      !english?.title ||
      !english?.city ||
      !english?.shortDescription ||
      !english?.description ||
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
    if (!editingPackage && !formData.images.some((img) => img instanceof File)) {
      alert("At least one package image is required.");
      return;
    }

    const formDataToSend = new FormData();

    formDataToSend.append("price", formData.price.toString());
    formDataToSend.append(
      "numberOfPeople",
      formData.numberOfPeople.toString(),
    );
    formDataToSend.append("numberOfDays", formData.numberOfDays.toString());
    formDataToSend.append("featured", formData.isFeatured.toString());
    formDataToSend.append("translations", JSON.stringify(translationsPayload));

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
            {/* Instructions */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Workflow:</span>
              </p>
              <ol className="text-sm text-amber-900 list-decimal list-inside mt-2 space-y-1">
                <li>
                  Fill <strong>Package Details</strong> (price, people, days,
                  and images) once.
                </li>
                <li>
                  Select <strong>EN</strong> and fill all required English
                  translation fields.
                </li>
                <li>
                  Fill optional ES, FR, RU, and DE translations when available.
                </li>
              </ol>
            </div>

            <div className="space-y-4">
              {/* Language Selector */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-700">
                    Select Language to Fill:
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["en", "es", "fr", "ru", "de"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCurrentLang(lang as LanguageCode)}
                      className={`px-3 py-2 rounded-full border transition-all ${
                        currentLang === lang
                          ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-lg"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Language Indicator */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-900">
                  Currently editing:{" "}
                  <span className="font-bold">{currentLang.toUpperCase()}</span>{" "}
                  language only
                </span>
              </div>

              {/* Translation Fields - Only for Current Language */}
              <div className="grid md:grid-cols-2 gap-6 p-5 rounded-lg bg-blue-50 border-2 border-blue-200">
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
                  <Label htmlFor="translationHighlights">
                    Highlights ({currentLang.toUpperCase()})
                  </Label>
                  <Input
                    id="translationHighlights"
                    value={translations[currentLang].highlights}
                    placeholder="Comma-separated package highlights"
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [currentLang]: {
                          ...prev[currentLang],
                          highlights: e.target.value,
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

            {/* Package details apply to the whole package, not per locale. */}
            <div className="border-t-2 border-slate-300 pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Package Details
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                Fill these once. Translated title, city, places, descriptions,
                inclusions, exclusions, and highlights belong in the language
                tabs above.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price (INR) *</Label>
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
                <Label htmlFor="numberOfPeople">Number of People *</Label>
                <Input
                  id="numberOfPeople"
                  type="number"
                  required
                  min="1"
                  value={formData.numberOfPeople}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfPeople: parseInt(e.target.value, 10) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfDays">Number of Days *</Label>
                <Input
                  id="numberOfDays"
                  type="number"
                  required
                  min="1"
                  value={formData.numberOfDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfDays: parseInt(e.target.value, 10) || 1,
                    })
                  }
                />
              </div>
            </div>

            {/* Location Multi-Select Dropdown */}
            <div className="space-y-2">
              <Label className="font-semibold">Locations</Label>
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
                        img instanceof File
                          ? URL.createObjectURL(img)
                          : resolvePackageImageUrl(img)
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

            {/* Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
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
