"use client";

import { useState } from "react";
import { User, Phone, Mail, Globe, MessageSquare, Send, CheckCircle } from "lucide-react";
import { apiService } from "@/lib/service/api";

interface Props {
  serviceName: string;
}

export default function ServiceContactForm({ serviceName }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    nationality: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      newErrors.fullName = "Name is required (min 2 chars)";
    if (!form.phoneNumber.trim() || form.phoneNumber.trim().length < 10)
      newErrors.phoneNumber = "Valid phone number required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Valid email required";
    if (!form.nationality.trim() || form.nationality.trim().length < 2)
      newErrors.nationality = "Nationality required";
    if (!form.message.trim() || form.message.trim().length < 10)
      newErrors.message = "Message must be at least 10 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError("");

    try {
      await apiService.post("/lead/contact", {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim().toLowerCase(),
        nationality: form.nationality.trim(),
        category: "service",
        serviceName: serviceName,
        subject: `Service Inquiry: ${serviceName}`,
        message: form.message.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h4 className="text-lg font-bold text-slate-800 mb-1">
          Inquiry Submitted!
        </h4>
        <p className="text-sm text-slate-500">
          We&apos;ll get back to you soon about{" "}
          <span className="font-semibold text-orange-600">{serviceName}</span>.
        </p>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm transition-all outline-none ${
      errors[field]
        ? "border-red-300 bg-red-50"
        : "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Full Name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <User className="w-3.5 h-3.5" />
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="John Doe"
            value={form.fullName}
            className={inputClass("fullName")}
            disabled={isSubmitting}
            onChange={(e) => {
              setForm({ ...form, fullName: e.target.value });
              setErrors({ ...errors, fullName: "" });
            }}
          />
          {errors.fullName && (
            <p className="text-red-500 text-xs mt-0.5">{errors.fullName}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Phone className="w-3.5 h-3.5" />
            Phone Number <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={form.phoneNumber}
            className={inputClass("phoneNumber")}
            disabled={isSubmitting}
            onChange={(e) => {
              setForm({ ...form, phoneNumber: e.target.value });
              setErrors({ ...errors, phoneNumber: "" });
            }}
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-xs mt-0.5">{errors.phoneNumber}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Mail className="w-3.5 h-3.5" />
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            placeholder="john@example.com"
            value={form.email}
            className={inputClass("email")}
            disabled={isSubmitting}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setErrors({ ...errors, email: "" });
            }}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>
          )}
        </div>

        {/* Nationality */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Globe className="w-3.5 h-3.5" />
            Nationality <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Indian"
            value={form.nationality}
            className={inputClass("nationality")}
            disabled={isSubmitting}
            onChange={(e) => {
              setForm({ ...form, nationality: e.target.value });
              setErrors({ ...errors, nationality: "" });
            }}
          />
          {errors.nationality && (
            <p className="text-red-500 text-xs mt-0.5">{errors.nationality}</p>
          )}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          placeholder="I'm interested in this tour package. Please share more details..."
          rows={3}
          value={form.message}
          className={`${inputClass("message")} resize-none`}
          disabled={isSubmitting}
          onChange={(e) => {
            setForm({ ...form, message: e.target.value });
            setErrors({ ...errors, message: "" });
          }}
        />
        {errors.message && (
          <p className="text-red-500 text-xs mt-0.5">{errors.message}</p>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Inquiry
          </>
        )}
      </button>
    </form>
  );
}
