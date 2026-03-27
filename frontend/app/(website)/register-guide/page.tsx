"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper to fetch current user's guide application
async function fetchMyGuideApplication() {
  const res = await fetch(`${API_BASE_URL}/guides/me`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || null;
}

const languageOptions = [
  "English",
  "Spanish",
  "French",
  "Japanese",
  "Russian",
  "Chinese",
  "German",
  "Italian",
  "Portuguese",
  "Thai",
  "Arabic",
  "Other",
];

// Validation helpers
function validateString(value: string, fieldName: string): string {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required.`;
  }
  if (value.trim().length < 2) {
    return `${fieldName} must be at least 2 characters.`;
  }
  return "";
}

function validatePhone(phone: string): string {
  if (!phone || phone.length === 0) {
    return "Phone number is required.";
  }
  if (phone.length !== 10) {
    return "Phone number must be exactly 10 digits.";
  }
  return "";
}

export default function BecomeGuidePage() {
  const { t } = useLanguage();

  // Guide application state
  const [myGuide, setMyGuide] = useState<any>(null);
  const [loadingGuide, setLoadingGuide] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pan, setPan] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [guideType, setGuideType] = useState<"" | "normal" | "escort">("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerError, setDisclaimerError] = useState("");

  // File states
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Error states
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showLangError, setShowLangError] = useState(false);
  // Email validation helper
  function validateEmail(email: string): string {
    if (!email || email.trim().length === 0) {
      return "Email is required.";
    }
    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address.";
    }
    return "";
  }

  // UI states
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch guide application on mount
  useEffect(() => {
    fetchMyGuideApplication().then((g) => {
      setMyGuide(g);
      setLoadingGuide(false);
    });
  }, []);

  // Razorpay payment integration
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Language handlers
  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
    setShowLangError(false);
  };

  const removeLanguage = (lang: string) => {
    setLanguages((prev) => prev.filter((l) => l !== lang));
  };

  // Phone number handler
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setPhone(value);
      if (value.length > 0) {
        setPhoneError(validatePhone(value));
      } else {
        setPhoneError("");
      }
    }
  };

  // File handlers
  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setProfileFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAadhaarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setAadhaarFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAadhaarPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Main submit handler - submits form for admin review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    const nameValidation = validateString(name, "Name");
    if (nameValidation) {
      setNameError(nameValidation);
      setMessage(nameValidation);
      return;
    }

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      setMessage(emailValidation);
      return;
    }

    const locationValidation = validateString(location, "Location");
    if (locationValidation) {
      setLocationError(locationValidation);
      setMessage(locationValidation);
      return;
    }

    const phoneValidation = validatePhone(phone);
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      setMessage(phoneValidation);
      return;
    }

    if (languages.length === 0) {
      setShowLangError(true);
      setMessage("Please select at least one preferred language.");
      return;
    }

    if (!profileFile) {
      setMessage("Please upload a profile image.");
      return;
    }

    if (!file) {
      setMessage("Please upload your license/ID image.");
      return;
    }

    if (!aadhaarFile) {
      setMessage("Please upload your Aadhaar (image or PDF).");
      return;
    }

    if (!guideType) {
      setMessage("Please select a guide type.");
      return;
    }

    if (!disclaimerAccepted) {
      setDisclaimerError("Please accept the disclaimer to proceed.");
      setMessage("Please accept the disclaimer to proceed.");
      return;
    }

    setSubmitting(true);

    // Submit form for admin review (no payment yet)
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("city", location);
    formData.append("phone", phone);
    formData.append("languages", JSON.stringify(languages));
    formData.append("type", guideType);
    formData.append("pan", pan || "");
    formData.append("photo", profileFile);
    formData.append("aadhar", aadhaarFile);
    formData.append("licence", file);

    try {
      const res = await fetch(`${API_BASE_URL}/guide/enroll`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const enrollmentData = data.data || data;

        if (!enrollmentData || !enrollmentData.razorpay_options) {
          setMessage("Payment initialization failed. Please contact support.");
          setSubmitting(false);
          return;
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setMessage("Failed to load payment gateway. Please try again later.");
          setSubmitting(false);
          return;
        }

        const options = {
          key: enrollmentData.razorpay_options.key,
          amount: enrollmentData.razorpay_options.amount,
          currency: enrollmentData.razorpay_options.currency,
          name: enrollmentData.razorpay_options.name,
          description: enrollmentData.razorpay_options.description,
          order_id: enrollmentData.razorpay_options.order_id,
          handler: async function (response: any) {
            const verifyRes = await fetch(
              `${API_BASE_URL}/guide/confirm-payment/${enrollmentData.enrollment_id}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  transaction_id: enrollmentData.transaction_id,
                }),
                credentials: "include",
              },
            );

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setMessage(
                "Payment completed successfully! Your guide account has been created.",
              );

              // Reset form
              setName("");
              setPan("");
              setEmail("");
              setAadhaarFile(null);
              setAadhaarPreview(null);
              setProfileFile(null);
              setProfilePreview(null);
              setLocation("");
              setLanguages([]);
              setShowLangError(false);
              setFile(null);
              setPreview(null);
              setGuideType("");
              setNameError("");
              setEmailError("");
              setLocationError("");
              setPhone("");
              setPhoneError("");
              setDisclaimerAccepted(false);
              setDisclaimerError("");

              // Refetch guide application
              fetchMyGuideApplication().then((g) => setMyGuide(g));
            } else {
              console.error(
                "❌ Payment verification failed:",
                verifyData.message,
              );
              setMessage(verifyData.message || "Payment verification failed.");
            }
            setSubmitting(false);
          },
          prefill: {
            name: enrollmentData.razorpay_options.prefill.name,
            contact: enrollmentData.razorpay_options.prefill.contact,
            email: enrollmentData.razorpay_options.prefill.email,
          },
          theme: {
            color: "#6366f1",
          },
          modal: {
            ondismiss: () => {
              console.warn("⚠️ Payment modal dismissed by user");
              setMessage(
                "Payment was cancelled. Your application was not completed.",
              );
              setSubmitting(false);
            },
          },
        };

        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        console.error("Enrollment failed:", data.message);
        setMessage(data.message || "Failed to submit application.");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Exception during enrollment:", err);
      setMessage("An error occurred. Please try again later.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Become a Guide
          </h1>
          <p className="text-lg text-gray-600">
            Join our community and start sharing your local expertise
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Registration Fee: ₹500 (One-time payment)
          </p>
        </div>

        {/* Application Status Display */}
        {!loadingGuide && myGuide && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 text-blue-500 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-1">
                    Registration Complete! ✅
                  </h3>
                  <p className="text-blue-800">
                    Your guide account is now active. You can start accepting
                    bookings!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card - Only show if no application */}
        {!myGuide && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Photo Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-indigo-100">
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
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
                    )}
                  </div>
                  <label
                    htmlFor="profile-upload"
                    className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <input
                      id="profile-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Profile Photo
                  </p>
                  <p className="text-xs text-gray-500">
                    Upload a clear photo where your face is visible
                  </p>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">
                    1
                  </span>
                  Personal Information
                </h2>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (e.target.value) {
                        setNameError(validateString(e.target.value, "Name"));
                      } else {
                        setNameError("");
                      }
                    }}
                    className={`w-full px-4 py-3 border ${
                      nameError ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                    placeholder="Enter your full name"
                  />
                  {nameError && (
                    <p className="mt-1 text-sm text-red-600">{nameError}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (e.target.value) {
                        setEmailError(validateEmail(e.target.value));
                      } else {
                        setEmailError("");
                      }
                    }}
                    className={`w-full px-4 py-3 border ${
                      emailError ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                    placeholder="Enter your email address"
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className={`w-full px-4 py-3 border ${
                      phoneError ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guide Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (e.target.value) {
                        setLocationError(
                          validateString(e.target.value, "Location"),
                        );
                      } else {
                        setLocationError("");
                      }
                    }}
                    className={`w-full px-4 py-3 border ${
                      locationError ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                    placeholder="City or region where you guide"
                  />
                  {locationError && (
                    <p className="mt-1 text-sm text-red-600">{locationError}</p>
                  )}
                </div>

                {/* Guide Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guide Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={guideType}
                    onChange={(e) =>
                      setGuideType(e.target.value as "" | "normal" | "escort")
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select guide type</option>
                    <option value="normal">Normal Guide</option>
                    <option value="escort">Escort Guide</option>
                  </select>
                </div>

                {/* PAN Card (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Card Number{" "}
                    <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">
                    2
                  </span>
                  Verification Documents
                </h2>

                {/* License/ID Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID / License (PDF) <span className="text-red-500">*</span>
                  </label>
                  <label className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-gray-600">
                      {file ? file.name : "Upload PDF"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleLicenseFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* License Preview */}
                  {preview && file && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg
                            className="w-8 h-8 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Document Preview
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setPreview(null);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-700">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Aadhaar Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Card (PDF) <span className="text-red-500">*</span>
                  </label>
                  <label className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-gray-600">
                      {aadhaarFile ? aadhaarFile.name : "Upload PDF"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleAadhaarFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Aadhaar Preview */}
                  {aadhaarPreview && aadhaarFile && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg
                            className="w-8 h-8 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Document Preview
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setAadhaarFile(null);
                                setAadhaarPreview(null);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-700">
                            {aadhaarFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(aadhaarFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 flex items-center mb-2">
                    <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">
                      3
                    </span>
                    Languages <span className="text-red-500">*</span>
                  </h2>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800 font-medium">
                      💰 Know other languages? Earn ₹800+ extra per tour!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {languageOptions.map((lang) => (
                    <label
                      key={lang}
                      className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={languages.includes(lang)}
                        onChange={() => toggleLanguage(lang)}
                        className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{lang}</span>
                    </label>
                  ))}
                </div>

                {languages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {languages.map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                      >
                        {l}
                        <button
                          type="button"
                          onClick={() => removeLanguage(l)}
                          className="ml-2 text-indigo-500 hover:text-indigo-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {showLangError && languages.length === 0 && (
                  <p className="text-sm text-red-600">
                    Please select at least one language.
                  </p>
                )}
              </div>

              {/* Disclaimer */}
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">
                    4
                  </span>
                  Disclaimer
                </h2>
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 text-xs text-gray-700 leading-relaxed max-h-64 overflow-y-auto">
                  <p>Disclaimer for Tour Guide/Escort</p>
                  <p className="mt-2">
                    I hereby voluntarily upload my personal and professional
                    documents on getmyguide.in for profile verification and
                    global visibility to obtain tour assignments directly from
                    clients and confirm that all information provided is true
                    and submitted at my own discretion. I understand that
                    getmyguide.in operates only as a listing platform and is not
                    responsible for services rendered by me. During the period a
                    client or group is under my guided tour, I shall exercise
                    reasonable care for their coordination, assistance, and
                    safety, comply with applicable laws and tourism regulations,
                    maintain emergency contacts, and follow standard safety
                    practices. Any service-related responsibility, conduct,
                    incident, or dispute arising during the tour shall be
                    handled directly between me and the client, and
                    www.getmyguide.in shall not be liable except as required
                    under applicable law. All disputes shall be subject to the
                    exclusive jurisdiction of the competent courts at Delhi
                    only. I agree to pay a subscription fee of Rs 499 per month
                    to remain listed on the platform and accept that platform
                    terms and conditions may be amended from time to time and
                    shall be binding upon me. In the event of unavoidable
                    circumstances including life-threatening emergencies, health
                    issues, natural events, or situations beyond reasonable
                    control, neither www.getmyguide.in, its authorities, nor the
                    client shall be held responsible, and all parties shall act
                    in good faith to ensure safety and necessary assistance.
                  </p>
                </div>
                <label className="flex items-start space-x-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => {
                      setDisclaimerAccepted(e.target.checked);
                      if (e.target.checked) {
                        setDisclaimerError("");
                      }
                    }}
                    className="mt-1 h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>I have read and agree to the disclaimer above.</span>
                </label>
                {disclaimerError && (
                  <p className="text-sm text-red-600">{disclaimerError}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6 space-y-4">
                <button
                  type="submit"
                  disabled={submitting || !disclaimerAccepted}
                  className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </button>

                {message && (
                  <div
                    className={`p-4 rounded-lg ${
                      message.includes("successfully")
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-start">
                      {message.includes("successfully") ? (
                        <svg
                          className="w-5 h-5 text-green-500 mt-0.5 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-red-500 mt-0.5 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <p
                        className={`text-sm ${
                          message.includes("successfully")
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Your information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
