"use client";

import React, { useState } from "react";
import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle,
  HelpCircle,
  Users,
  Shield,
  Loader2,
} from "lucide-react";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phoneNumber: "",
  nationality: "",
  subject: "",
  category: "tour booking",
  message: "",
};

export default function ContactPage() {
  const { t } = useLanguage();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/lead/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `Error ${res.status}`);
      setSubmitted(true);
      setForm({ ...EMPTY_FORM });
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";

  const contactInfo = [
    { icon: <Phone className="w-6 h-6 text-primary" />, title: t("contact_info_phone_title"), details: ["+91 9891888444", "+91 7470222666"], desc: t("contact_info_phone_desc") },
    { icon: <Mail className="w-6 h-6 text-primary" />, title: t("contact_info_email_title"), details: ["Contact@getmyguide.in"], desc: t("contact_info_email_desc") },
    { icon: <MapPin className="w-6 h-6 text-primary" />, title: t("contact_info_office_title"), details: ["A-1/100 Chattarpur Extension", "New Delhi - 110074"], desc: t("contact_info_office_desc") },
    { icon: <Clock className="w-6 h-6 text-primary" />, title: t("contact_info_hours_title"), details: ["Mon-Sun: 6 AM - 11 PM", "Emergency: 24/7"], desc: t("contact_info_hours_desc") },
  ];

  const faqCategories = [
    { icon: <Users className="w-6 h-6 text-primary" />, title: t("contact_faq_cat_travelers"), questions: ["contact_faq_q1","contact_faq_q2","contact_faq_q3","contact_faq_q4"] },
    { icon: <Shield className="w-6 h-6 text-primary" />, title: t("contact_faq_cat_guides"), questions: ["contact_faq_q5","contact_faq_q6","contact_faq_q7","contact_faq_q8"] },
    { icon: <HelpCircle className="w-6 h-6 text-primary" />, title: t("contact_faq_cat_general"), questions: ["contact_faq_q9","contact_faq_q10","contact_faq_q11","contact_faq_q12"] },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Banner. The flyer carries its own headline, phone, email and address,
          so it is shown on its own with nothing overlaid on it. Held at 90% of
          the viewport so it fills the screen with a thin gutter on either side,
          and capped at the flyer's native 1600px so very wide monitors don't
          upscale it into softness. The box keeps the native 1600x800 ratio, so
          the image is never cropped and no backing colour is ever visible
          around it. The page's h1 lives inside the image, so it is repeated for
          screen readers and search engines. */}
      <h1 className="sr-only">{t("contact_title")}</h1>
      <section className="w-full py-6 md:py-10">
        <div className="mx-auto w-[90%] max-w-400">
          <div className="relative w-full aspect-2/1 overflow-hidden rounded-2xl shadow-lg md:rounded-3xl">
            <Image
              src={IMAGES.contactHero}
              alt="Contact us to create your lifetime memory — the GetMyGuide team at work. Call +91-7470222666 or +91-9891888444, email contact@getmyguide.in, or visit A-1/100 Chhatarpur Ext., New Delhi - 110074, India."
              fill
              priority
              sizes="(min-width: 1778px) 1600px, 90vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm text-center border border-gray-100">
                <div className="flex justify-center mb-3">{info.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{info.title}</h3>
                {info.details.map((d, j) => <p key={j} className="text-sm text-gray-700 font-medium">{d}</p>)}
                <p className="text-xs text-gray-500 mt-1">{info.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + FAQ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* CONTACT FORM */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("contact_form_section_title")}</h2>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t("contact_form_card_title")}</h3>
                <p className="text-sm text-gray-500 mb-6">{t("contact_form_card_desc")}</p>

                {submitted ? (
                  <div className="text-center py-10">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t("contact_form_success_title")}</h3>
                    <p className="text-gray-500 mb-6">{t("contact_form_success_desc")}</p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                        {errorMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.fullName}
                          onChange={set("fullName")}
                          placeholder="Your full name"
                          required
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={form.phoneNumber}
                          onChange={set("phoneNumber")}
                          placeholder="+91 9876543210"
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={set("email")}
                          placeholder="your@email.com"
                          required
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nationality <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.nationality}
                          onChange={set("nationality")}
                          placeholder="Indian"
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.category}
                        onChange={set("category")}
                        className={inputCls}
                        required
                      >
                        <option value="tour booking">Tour Booking</option>
                        <option value="become a guide">Become a Guide</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={set("subject")}
                        placeholder="Brief subject of your inquiry"
                        required
                        minLength={5}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={form.message}
                        onChange={set("message")}
                        placeholder="Please describe your inquiry in detail..."
                        required
                        minLength={10}
                        rows={5}
                        className={inputCls}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="w-4 h-4" /> Send Message</>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("contact_faq_section_title")}</h2>
              <div className="space-y-4">
                {faqCategories.map((cat, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      {cat.icon}
                      <h3 className="font-semibold text-gray-900">{cat.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {cat.questions.map((q, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                          <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          {t(q)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Address. The flyer holds the office location, map and communication
          address. Sized exactly like the banner above — 90% of the viewport,
          capped at its own native 1536px — so the two line up and no dead space
          is left at the sides. The box keeps the native 1536x1024 ratio, so the
          image is never cropped and no backing colour shows around it. */}
      <section className="w-full py-6 md:py-10">
        <h2 className="sr-only">{t("contact_map_section_title")}</h2>
        <div className="mx-auto w-[90%] max-w-384">
          <div className="relative aspect-3/2 w-full overflow-hidden rounded-2xl shadow-lg md:rounded-3xl">
            <Image
              src={IMAGES.contactAddress}
              alt="Reach out to us at getmyguide.in — our office location and communication address: A-1/100, Chhatarpur Ext., New Delhi - 110074, India."
              fill
              sizes="(min-width: 1707px) 1536px, 90vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
