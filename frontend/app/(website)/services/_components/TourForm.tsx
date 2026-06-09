"use client";

import { useState } from "react";
import { TourData } from "../types/tour";
import { X, Upload, MapPin, IndianRupee, Users, Calendar } from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

interface Props {
  onSubmit: (data: TourData) => Promise<boolean>;
}

type LanguageCode = "en" | "es" | "fr" | "ru" | "de";

const defaultLanguage: LanguageCode = "en";
const supportedLanguages: LanguageCode[] = ["en", "es", "fr", "ru", "de"];
const translationLanguages: LanguageCode[] = supportedLanguages.filter(
  (lang) => lang !== defaultLanguage,
);

const MAX_IMAGES = 8;

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

interface FormState {
  title: string;
  city: string;
  places: string;
  price: string;
  baseCurrency: string;
  shortDescription: string;
  description: string;
  numberOfPeople: string;
  numberOfDays: string;
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

export default function TourForm({ onSubmit }: Props) {
  const [form, setForm] = useState<FormState>({
    title: "",
    city: "",
    places: "",
    price: "",
    baseCurrency: "INR",
    shortDescription: "",
    description: "",
    numberOfPeople: "",
    numberOfDays: "",
    inclusions: "",
    exclusions: "",
    highlights: "",
  });
  const [currentLang, setCurrentLang] = useState<LanguageCode>("es");
  const [translations, setTranslations] = useState<
    Record<LanguageCode, TranslationFormState>
  >({
    en: createTranslationState(),
    es: createTranslationState(),
    fr: createTranslationState(),
    ru: createTranslationState(),
    de: createTranslationState(),
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
    e.currentTarget.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setErrors({ ...errors, images: "" });
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.title.trim()) newErrors.title = "Package title is required";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.places.trim()) newErrors.places = "At least one place is required";

    if (!form.shortDescription.trim()) {
      newErrors.shortDescription = "Short description is required";
    }

    if (!form.description.replace(/<[^>]*>/g, "").trim()) newErrors.description = "Full description is required";
    if (!form.inclusions.trim()) newErrors.inclusions = "At least one inclusion is required";
    if (!form.exclusions.trim()) newErrors.exclusions = "At least one exclusion is required";
    if (!form.highlights.trim()) newErrors.highlights = "At least one highlight is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      newErrors.price = "A valid price is required";
    if (!form.numberOfPeople || Number(form.numberOfPeople) < 1)
      newErrors.numberOfPeople = "Number of people is required (min 1)";
    if (!form.numberOfDays || Number(form.numberOfDays) < 1)
      newErrors.numberOfDays = "Number of days is required (min 1)";
    if (images.length === 0)
      newErrors.images = "At least one image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalizeArray = (rawValue: string) =>
    rawValue
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item);

  const updateTranslationValue = (
    field: keyof TranslationFormState,
    value: string,
    lang: LanguageCode,
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
    if (field === "shortDescription") {
      setErrors((prev) => ({ ...prev, [`shortDescription_${lang}`]: "" }));
    }
  };

  const buildTranslationPayload = (values: TranslationFormState) => {
    const places = normalizeArray(values.places);
    const inclusions = normalizeArray(values.inclusions);
    const exclusions = normalizeArray(values.exclusions);
    const highlights = normalizeArray(values.highlights);

    return {
      ...(values.title.trim() && { title: values.title.trim() }),
      ...(values.city.trim() && { city: values.city.trim() }),
      ...(places.length && { places }),
      ...(values.shortDescription.trim() && {
        shortDescription: values.shortDescription.trim(),
      }),
      ...(values.description.replace(/<[^>]*>/g, "").trim() && {
        description: values.description.trim(),
      }),
      ...(inclusions.length && { inclusions }),
      ...(exclusions.length && { exclusions }),
      ...(highlights.length && { highlights }),
    };
  };

  const getEnglishTranslationValues = (): TranslationFormState => ({
    title: form.title,
    city: form.city,
    places: form.places,
    shortDescription: form.shortDescription,
    description: form.description,
    inclusions: form.inclusions,
    exclusions: form.exclusions,
    highlights: form.highlights,
  });

  const buildTranslations = () => {
    const result = {
      [defaultLanguage]: buildTranslationPayload(getEnglishTranslationValues()),
    } as Record<LanguageCode, any>;

    return translationLanguages.reduce((acc, lang) => {
      const values = translations[lang];
      const payload = buildTranslationPayload(values);
      if (Object.keys(payload).length) acc[lang] = payload;
      return acc;
    }, result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const placesArray = normalizeArray(form.places);

    const tourData: TourData = {
      id: Date.now().toString(),
      title: form.title,
      city: form.city,
      places: placesArray,
      images,
      price: Number(form.price),
      baseCurrency: form.baseCurrency.trim() || "INR",
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      numberOfPeople: Number(form.numberOfPeople),
      numberOfDays: Number(form.numberOfDays),
      inclusions: normalizeArray(form.inclusions),
      exclusions: normalizeArray(form.exclusions),
      translations: buildTranslations(),
    };

    const ok = await onSubmit(tourData);
    if (!ok) return;

    previews.forEach((url) => URL.revokeObjectURL(url));

    setForm({
      title: "",
      city: "",
      places: "",
      price: "",
      baseCurrency: "INR",
      shortDescription: "",
      description: "",
      numberOfPeople: "",
      numberOfDays: "",
      inclusions: "",
      exclusions: "",
      highlights: "",
    });
    setTranslations({
      en: createTranslationState(),
      es: createTranslationState(),
      fr: createTranslationState(),
      ru: createTranslationState(),
      de: createTranslationState(),
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
      <h2 className="text-3xl font-bold mb-6 text-slate-800">Create Package</h2>

      {/* ── Step 1: English Content & Package Details ── */}
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-white text-sm font-bold shrink-0">
          1
        </span>
        <span className="text-base font-semibold text-slate-700">
          Package Details (English) — required
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Left Column */}
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
              Places — comma-separated *
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

          {/* Price + Currency */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <IndianRupee className="inline w-4 h-4 mr-1" /> Price *
              </label>
              <input
                type="number"
                value={form.price}
                placeholder="4999"
                min="0"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                  errors.price
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
                }`}
                onChange={(e) => {
                  setForm({ ...form, price: e.target.value });
                  setErrors({ ...errors, price: "" });
                }}
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Currency
              </label>
              <input
                type="text"
                value={form.baseCurrency}
                placeholder="INR"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none"
                onChange={(e) =>
                  setForm({ ...form, baseCurrency: e.target.value })
                }
              />
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Short Description *
            </label>
            <textarea
              value={form.shortDescription}
              placeholder="A brief overview of the tour package..."
              rows={3}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none resize-none ${
                errors.shortDescription
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
              }`}
              onChange={(e) => {
                setForm({ ...form, shortDescription: e.target.value });
                setErrors({ ...errors, shortDescription: "" });
              }}
            />
            {errors.shortDescription && (
              <p className="text-red-500 text-xs mt-1">{errors.shortDescription}</p>
            )}
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Description *
            </label>
            <div className={errors.description ? "ring-2 ring-red-300 rounded-3xl" : ""}>
              <RichTextEditor
                content={form.description}
                onChange={(html) => {
                  setForm({ ...form, description: html });
                  setErrors({ ...errors, description: "" });
                }}
                placeholder="Write a detailed tour description with bold, headings, lists..."
              />
            </div>
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          {/* Inclusions */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Inclusions — comma-separated *
            </label>
            <input
              type="text"
              value={form.inclusions}
              placeholder="Hotel, Breakfast, Transfers"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                errors.inclusions
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
              }`}
              onChange={(e) => {
                setForm({ ...form, inclusions: e.target.value });
                setErrors({ ...errors, inclusions: "" });
              }}
            />
            {errors.inclusions && (
              <p className="text-red-500 text-xs mt-1">{errors.inclusions}</p>
            )}
          </div>

          {/* Exclusions */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Exclusions — comma-separated *
            </label>
            <input
              type="text"
              value={form.exclusions}
              placeholder="Lunch, Flights, Personal expenses"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                errors.exclusions
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
              }`}
              onChange={(e) => {
                setForm({ ...form, exclusions: e.target.value });
                setErrors({ ...errors, exclusions: "" });
              }}
            />
            {errors.exclusions && (
              <p className="text-red-500 text-xs mt-1">{errors.exclusions}</p>
            )}
          </div>

          {/* Highlights */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Highlights — comma-separated *
            </label>
            <input
              type="text"
              value={form.highlights}
              placeholder="Sunrise at Taj Mahal, Camel ride, Boat on Ganges"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                errors.highlights
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
              }`}
              onChange={(e) => {
                setForm({ ...form, highlights: e.target.value });
                setErrors({ ...errors, highlights: "" });
              }}
            />
            {errors.highlights && (
              <p className="text-red-500 text-xs mt-1">{errors.highlights}</p>
            )}
          </div>

          {/* No. of People and No. of Days */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                No. of People *
              </label>
              <input
                type="number"
                value={form.numberOfPeople}
                placeholder="10"
                min="1"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                  errors.numberOfPeople
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
                }`}
                onChange={(e) => {
                  setForm({ ...form, numberOfPeople: e.target.value });
                  setErrors({ ...errors, numberOfPeople: "" });
                }}
              />
              {errors.numberOfPeople && (
                <p className="text-red-500 text-xs mt-1">{errors.numberOfPeople}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                No. of Days *
              </label>
              <input
                type="number"
                value={form.numberOfDays}
                placeholder="5"
                min="1"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                  errors.numberOfDays
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 focus:border-blue-400 focus:bg-blue-50/30"
                }`}
                onChange={(e) => {
                  setForm({ ...form, numberOfDays: e.target.value });
                  setErrors({ ...errors, numberOfDays: "" });
                }}
              />
              {errors.numberOfDays && (
                <p className="text-red-500 text-xs mt-1">{errors.numberOfDays}</p>
              )}
            </div>
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

      {/* ── Step 2: Translations (optional) ── */}
      <div className="flex items-center gap-3 mb-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-700 text-sm font-bold shrink-0">
          2
        </span>
        <span className="text-base font-semibold text-slate-700">
          Add Translations{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Only content fields are translatable — title, descriptions, city, places, inclusions, exclusions.
        Price, images, and capacity are shared across all languages.
      </p>

      <div className="mb-8">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          {translationLanguages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setCurrentLang(lang)}
              className={`px-3 py-2 rounded-full border transition ${
                currentLang === lang
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-3xl bg-slate-50 p-4 border border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title ({currentLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={translations[currentLang].title}
              placeholder="Translated title"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none"
              onChange={(e) =>
                updateTranslationValue("title", e.target.value, currentLang)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              City ({currentLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={translations[currentLang].city}
              placeholder="Translated city"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none"
              onChange={(e) =>
                updateTranslationValue("city", e.target.value, currentLang)
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Places ({currentLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={translations[currentLang].places}
              placeholder="Comma-separated translated places"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none"
              onChange={(e) =>
                updateTranslationValue("places", e.target.value, currentLang)
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Short Description ({currentLang.toUpperCase()})
            </label>
            <textarea
              value={translations[currentLang].shortDescription}
              rows={3}
              placeholder="Translated short description"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none resize-none"
              onChange={(e) =>
                updateTranslationValue("shortDescription", e.target.value, currentLang)
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Description ({currentLang.toUpperCase()})
            </label>
            <RichTextEditor
              content={translations[currentLang].description}
              onChange={(html) =>
                updateTranslationValue("description", html, currentLang)
              }
              placeholder="Write rich text description for this locale"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Inclusions ({currentLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={translations[currentLang].inclusions}
              placeholder="Translated inclusions, comma-separated"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none"
              onChange={(e) =>
                updateTranslationValue("inclusions", e.target.value, currentLang)
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Exclusions ({currentLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={translations[currentLang].exclusions}
              placeholder="Translated exclusions, comma-separated"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none"
              onChange={(e) =>
                updateTranslationValue("exclusions", e.target.value, currentLang)
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Highlights ({currentLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={translations[currentLang].highlights}
              placeholder="Translated highlights, comma-separated"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none"
              onChange={(e) =>
                updateTranslationValue("highlights", e.target.value, currentLang)
              }
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8">
        <button
          type="submit"
          className="w-full bg-linear-to-r from-orange-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-orange-700 hover:to-pink-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          Create Package
        </button>
      </div>
    </form>
  );
}
