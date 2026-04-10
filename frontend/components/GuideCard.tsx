"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Languages, Loader2, ArrowLeft } from "lucide-react";
import type { GuideProfile } from "@/lib/data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GuideCardProps {
  guide: GuideProfile;
  checkoutHref?: string;
  buttonText?: string;
}

export function GuideCard({
  guide,
  buttonText = "Book Now",
}: GuideCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");

  const hasReviews = guide.numReviews && guide.numReviews > 0;

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setMessage("");
    setError("");
    setSubmitted(false);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/guide/contact-inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phoneNumber,
          email,
          nationality: "N/A",
          category: "tour booking" as const,
          subject: `Booking inquiry for guide: ${guide.name}`,
          message: message || `I would like to book guide ${guide.name}.`,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to submit. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-border/60">
      <CardHeader className="flex-row gap-4 items-center p-4">
        <div className="relative h-20 w-20 shrink-0">
          <Image
            src={guide.photo || "/placeholder-avatar.png"}
            alt={guide.name}
            fill
            className="object-cover rounded-full"
          />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{guide.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {hasReviews ? (
              <>
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-foreground">
                  {guide.averageRating?.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({guide.numReviews} reviews)
                </span>
              </>
            ) : (
              <Badge variant="outline">New Guide</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {!showForm ? (
        <>
          <CardContent className="grow p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>
                {guide.state && guide.country
                  ? `${guide.state}, ${guide.country}`
                  : guide.country || "Location not set"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Languages className="w-4 h-4 text-primary" />
              <span>
                {guide.languages?.join(", ") || "Languages not listed"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {guide.specializations?.slice(0, 3).map((spec) => (
                <Badge key={spec} variant="secondary">
                  {spec}
                </Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-4">
            <Button
              onClick={() => setShowForm(true)}
              className="w-full font-bold"
            >
              {buttonText}
            </Button>
          </CardFooter>
        </>
      ) : (
        <CardContent className="grow p-4">
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-2xl font-bold">&#10003;</span>
              </div>
              <h3 className="text-lg font-semibold text-green-600">
                Inquiry Submitted!
              </h3>
              <p className="text-sm text-muted-foreground">
                We will connect you with {guide.name} shortly.
              </p>
              <Button
                variant="outline"
                onClick={resetForm}
                className="mt-2"
              >
                Back to Guide
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`name-${guide._id}`} className="text-xs">
                  Full Name *
                </Label>
                <Input
                  id={`name-${guide._id}`}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`email-${guide._id}`} className="text-xs">
                  Email *
                </Label>
                <Input
                  id={`email-${guide._id}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`phone-${guide._id}`} className="text-xs">
                  Phone *
                </Label>
                <Input
                  id={`phone-${guide._id}`}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Your phone number"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`msg-${guide._id}`} className="text-xs">
                  Message
                </Label>
                <Textarea
                  id={`msg-${guide._id}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Travel plans, dates, group size..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 h-9"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-9 font-bold"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}
