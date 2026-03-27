"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Mail,
  Phone,
  User,
  Globe,
  MessageSquare,
  FileText,
  Send,
} from "lucide-react";
import { apiService } from "@/lib/service/api";
import { useToast } from "@/hooks/use-toast";

interface ContactFormData {
  fullName: string;
  phoneNumber: string;
  email: string;
  nationality: string;
  category: "tour booking" | "become a guide" | "other" | "";
  subject: string;
  message: string;
}

export function ContactForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    phoneNumber: "",
    email: "",
    nationality: "",
    category: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value as "tour booking" | "become a guide" | "other",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.fullName ||
      !formData.phoneNumber ||
      !formData.email ||
      !formData.nationality ||
      !formData.category ||
      !formData.subject ||
      !formData.message
    ) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.message.length < 10) {
      toast({
        title: "Error",
        description: "Message must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.post("/lead/contact", formData);

      toast({
        title: "✅ Form Submitted Successfully!",
        description:
          "Your inquiry has been submitted successfully. We'll get back to you soon.",
        duration: 5000,
      });

      // Reset form
      setFormData({
        fullName: "",
        phoneNumber: "",
        email: "",
        nationality: "",
        category: "",
        subject: "",
        message: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to submit inquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">
          Contact Us
        </CardTitle>
        <CardDescription>
          Fill out the form below and we'll get back to you as soon as possible
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="+1 234 567 8900"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Nationality */}
          <div className="space-y-2">
            <Label htmlFor="nationality" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Nationality <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nationality"
              name="nationality"
              type="text"
              placeholder="United States"
              value={formData.nationality}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={handleCategoryChange}
              disabled={isSubmitting}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tour booking">Tour Booking</SelectItem>
                <SelectItem value="become a guide">Become a Guide</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              placeholder="Brief description of your inquiry"
              value={formData.subject}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Please provide details about your inquiry..."
              value={formData.message}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters ({formData.message.length}/10)
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Inquiry
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
