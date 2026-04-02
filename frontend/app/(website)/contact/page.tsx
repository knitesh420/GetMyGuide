"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { createLead, resetLeadState } from "@/lib/redux/contactSlice";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import HeroSection from "@/components/all/CommonHeroSection";
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
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ContactPage() {
  const { t } = useLanguage();

  type ContactCategory =
    | "tour booking"
    | "become a guide"
    | "service"
    | "other";
  interface ContactFormData {
    fullName: string;
    email: string;
    phoneNumber: string;
    nationality: string;
    subject: string;
    category: ContactCategory;
    message: string;
  }

  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    email: "",
    phoneNumber: "",
    nationality: "",
    subject: "",
    category: "tour booking",
    message: "",
  });
  const dispatch: AppDispatch = useDispatch();
  const { loading, error, success } = useSelector(
    (state: RootState) => state.contacts,
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success) {
      setFormData({
        fullName: "",
        email: "",
        phoneNumber: "",
        nationality: "",
        subject: "",
        category: "tour booking",
        message: "",
      });
      timer = setTimeout(() => {
        dispatch(resetLeadState());
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [success, dispatch]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(createLead(formData));
  };

  const contactInfo = [
    {
      icon: <Phone className="w-6 h-6 text-primary" />,
      titleKey: "contact_info_phone_title",
      details: ["9891888444", "7470222666"],
      descriptionKey: "contact_info_phone_desc",
    },
    {
      icon: <Mail className="w-6 h-6 text-secondary" />,
      titleKey: "contact_info_email_title",
      details: ["Contact@getmyguide.in"],
      descriptionKey: "contact_info_email_desc",
    },
    {
      icon: <MapPin className="w-6 h-6 text-accent" />,
      titleKey: "contact_info_office_title",
      details: [
        "A-1/100 Chattarpur Extension birla Farm",
        "New Delhi - 110074",
      ],
      descriptionKey: "contact_info_office_desc",
    },
    {
      icon: <Clock className="w-6 h-6 text-green-600" />,
      titleKey: "contact_info_hours_title",
      details: ["Mon-Sun: 6 AM - 11 PM", "Emergency: 24/7"],
      descriptionKey: "contact_info_hours_desc",
    },
  ];

  const faqCategories = [
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      titleKey: "contact_faq_cat_travelers",
      questionKeys: [
        "contact_faq_q1",
        "contact_faq_q2",
        "contact_faq_q3",
        "contact_faq_q4",
      ],
    },
    {
      icon: <Shield className="w-6 h-6 text-secondary" />,
      titleKey: "contact_faq_cat_guides",
      questionKeys: [
        "contact_faq_q5",
        "contact_faq_q6",
        "contact_faq_q7",
        "contact_faq_q8",
      ],
    },
    {
      icon: <HelpCircle className="w-6 h-6 text-accent" />,
      titleKey: "contact_faq_cat_general",
      questionKeys: [
        "contact_faq_q9",
        "contact_faq_q10",
        "contact_faq_q11",
        "contact_faq_q12",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection
          badgeText={t("contact_badge")}
          title={t("contact_title")}
          description={t("contact_desc")}
          backgroundImage="/5.jpg"
        />

        <section className="py-16">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {contactInfo.map((info, index) => (
                <Card
                  key={index}
                  className="text-center hover:shadow-lg transition-shadow animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="flex justify-center mb-4">{info.icon}</div>
                    <CardTitle className="text-lg">
                      {t(info.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {info.details.map((detail, idx) => (
                        <p key={idx} className="font-medium">
                          {detail}
                        </p>
                      ))}
                      <CardDescription className="text-center">
                        {t(info.descriptionKey)}
                      </CardDescription>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-card">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl font-bold mb-8">
                  {t("contact_form_section_title")}
                </h2>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("contact_form_card_title")}</CardTitle>
                    <CardDescription>
                      {t("contact_form_card_desc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {success ? (
                      <div className="text-center py-8 transition-opacity duration-500">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          {t("contact_form_success_title")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("contact_form_success_desc")}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>
                              {t("contact_form_error_title")}
                            </AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="fullName">
                              {t("contact_form_name_label")}
                            </Label>
                            <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) =>
                                handleInputChange("fullName", e.target.value)
                              }
                              placeholder={t("contact_form_name_placeholder")}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="phoneNumber">
                              {t("contact_form_phone_label")}
                            </Label>
                            <Input
                              id="phoneNumber"
                              value={formData.phoneNumber}
                              onChange={(e) =>
                                handleInputChange("phoneNumber", e.target.value)
                              }
                              placeholder={t("contact_form_phone_placeholder")}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="email">
                              {t("contact_form_email_label")}
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) =>
                                handleInputChange("email", e.target.value)
                              }
                              placeholder={t("contact_form_email_placeholder")}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="nationality">
                              {t("contact_form_nationality_label") ||
                                "Nationality"}
                            </Label>
                            <Input
                              id="nationality"
                              value={formData.nationality}
                              onChange={(e) =>
                                handleInputChange("nationality", e.target.value)
                              }
                              placeholder={
                                t("contact_form_nationality_placeholder") ||
                                "Your nationality"
                              }
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="category">
                            {t("contact_form_category_label")}
                          </Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) =>
                              handleInputChange("category", value)
                            }
                            required
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t(
                                  "contact_form_category_placeholder",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tour booking">
                                {t("contact_form_cat_booking")}
                              </SelectItem>
                              <SelectItem value="become a guide">
                                {t("contact_form_cat_guide")}
                              </SelectItem>
                              <SelectItem value="other">
                                {t("contact_form_cat_other")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="subject">
                            {t("contact_form_subject_label")}
                          </Label>
                          <Input
                            id="subject"
                            value={formData.subject}
                            onChange={(e) =>
                              handleInputChange("subject", e.target.value)
                            }
                            placeholder={t("contact_form_subject_placeholder")}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="message">
                            {t("contact_form_message_label")}
                          </Label>
                          <Textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) =>
                              handleInputChange("message", e.target.value)
                            }
                            placeholder={t("contact_form_message_placeholder")}
                            rows={5}
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-primary hover:bg-primary/90"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                              {t("contact_form_sending")}
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />{" "}
                              {t("contact_form_send_button")}
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-8">
                  {t("contact_faq_section_title")}
                </h2>
                <div className="space-y-6">
                  {faqCategories.map((category, index) => (
                    <Card
                      key={index}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {category.icon}
                          <CardTitle className="text-lg">
                            {t(category.titleKey)}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {category.questionKeys.map((key, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span>{t(key)}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 bg-transparent"
                        >
                          {t("contact_faq_view_all")}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">
              {t("contact_map_section_title")}
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-200 h-96 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {t("contact_map_office_name")}
                  </h3>
                  <p className="text-muted-foreground">
                    A-1/100 Chattarpur Extension birla Farm
                    <br />
                    New Delhi - 110074, India
                  </p>
                  <Button className="mt-4 bg-primary hover:bg-primary/90">
                    {t("contact_map_get_directions")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
