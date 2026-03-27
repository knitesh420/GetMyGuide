// app/dashboard/admin/guides/EditGuideSheet.tsx
"use client";

import { useState, useEffect } from "react";
import type { Guide, AvailabilityPeriod, Review } from "@/lib/data";
import { toast } from "react-toastify";
import {
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  ShieldAlert,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CircularProgress } from "@/components/ui/CircularProgress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

// Helper function to calculate profile completion
const calculateProfileCompletion = (guide: Guide): number => {
  let score = 0;
  const totalPoints = 10;
  if (guide.name) score++;
  if (guide.email) score++;
  if (guide.mobile) score++;
  if (guide.age > 0) score++;
  if (guide.state && guide.country) score++;
  if (guide.experience) score++;
  if (guide.description) score++;
  if (guide.photo) score++;
  if (guide.languages.length > 0 && guide.languages[0]) score++;
  if (guide.specializations.length > 0 && guide.specializations[0]) score++;
  return (score / totalPoints) * 100;
};

// Interface for the form data, matching the Guide type
interface GuideFormData {
  name: string;
  email: string;
  mobile: string;
  age: number;
  state: string;
  country: string;
  languages: string[];
  experience: string;
  specializations: string[];
  description: string;
  photo: string;
  averageRating: number;
  numReviews: number;
  availabilityPeriods: string;
}

// Interface for the component's props
interface EditGuideSheetProps {
  guide: Guide & { reviews: Review[]; isApproved: boolean };
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (guideId: string, data: GuideFormData) => void;
  onDelete: (guideId: string) => void;
  onToggleApproval: (guideId: string) => void;
}

export const EditGuideSheet: React.FC<EditGuideSheetProps> = ({
  guide,
  isOpen,
  onOpenChange,
  onSave,
  onDelete,
  onToggleApproval,
}) => {
  const [formData, setFormData] = useState<GuideFormData>({
    name: "",
    email: "",
    mobile: "",
    age: 0,
    state: "",
    country: "",
    languages: [""],
    experience: "",
    specializations: [""],
    description: "",
    photo: "",
    averageRating: 0,
    numReviews: 0,
    availabilityPeriods: "[]",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (guide) {
      setFormData({
        name: guide.name,
        email: guide.email,
        mobile: guide.mobile,
        age: guide.age,
        state: guide.state,
        country: guide.country,
        languages: guide.languages.length ? guide.languages : [""],
        experience: guide.experience,
        specializations: guide.specializations.length
          ? guide.specializations
          : [""],
        description: guide.description,
        photo: guide.photo,
        averageRating: guide.averageRating,
        numReviews: guide.numReviews,
        availabilityPeriods: JSON.stringify(guide.availabilityPeriods, null, 2),
      });
    }
  }, [guide]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSave(guide._id, formData);
    setIsLoading(false);
  };

  const handleArrayFieldChange = (
    field: "languages" | "specializations",
    index: number,
    value: string
  ) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };
  const addArrayField = (field: "languages" | "specializations") => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };
  const removeArrayField = (
    field: "languages" | "specializations",
    index: number
  ) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length ? newArray : [""] });
  };

  const completion = calculateProfileCompletion(guide);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-5xl sm:max-w-5xl flex flex-col p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-2xl">Manage Guide Profile</SheetTitle>
          <SheetDescription>
            Edit details, approve, and view reviews for {guide.name}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* --- LEFT (ALL FORM FIELDS) --- */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile *</Label>
                  <Input
                    id="mobile"
                    required
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({ ...formData, age: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    required
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience *</Label>
                  <Input
                    id="experience"
                    placeholder="e.g., 5+ Years"
                    required
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData({ ...formData, experience: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo">Photo URL *</Label>
                  <Input
                    id="photo"
                    type="url"
                    required
                    value={formData.photo}
                    onChange={(e) =>
                      setFormData({ ...formData, photo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Average Rating</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    value={formData.averageRating}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        averageRating: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviews">Number of Reviews</Label>
                  <Input
                    id="reviews"
                    type="number"
                    value={formData.numReviews}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        numReviews: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  rows={5}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* --- Dynamic Arrays --- */}
              {[
                { key: "languages" as const, label: "Languages" },
                { key: "specializations" as const, label: "Specializations" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-3 p-4 border rounded-lg">
                  <Label className="font-semibold">{label}</Label>
                  {formData[key].map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="text"
                        value={item}
                        onChange={(e) =>
                          handleArrayFieldChange(key, index, e.target.value)
                        }
                        placeholder={`Enter ${label
                          .toLowerCase()
                          .slice(0, -1)}...`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayField(key, index)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayField(key)}
                    className="text-primary border-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add {label.slice(0, -1)}
                  </Button>
                </div>
              ))}

              {/* --- Availability (Advanced) --- */}
              <div className="space-y-2">
                <Label htmlFor="availability">
                  Availability Periods (JSON format)
                </Label>
                <Textarea
                  id="availability"
                  rows={6}
                  value={formData.availabilityPeriods}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      availabilityPeriods: e.target.value,
                    })
                  }
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {
                    'Enter as a valid JSON array. E.g., `[{"startDate": "2025-11-01", "endDate": "2025-11-10", "available": true}]`'
                  }
                </p>
              </div>
            </div>

            {/* --- RIGHT (ACTIONS & PROGRESS) --- */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Completion</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-6">
                  <CircularProgress
                    progress={completion}
                    size={140}
                    strokeWidth={12}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {completion < 100 && (
                    <p className="text-xs text-orange-600 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      Profile is incomplete. Approval is disabled.
                    </p>
                  )}
                  <Button
                    type="button"
                    className="w-full"
                    variant={guide.isApproved ? "destructive" : "default"}
                    disabled={completion < 100}
                    onClick={() => onToggleApproval(guide._id)}
                  >
                    {guide.isApproved ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Unapprove Guide
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Guide
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => onDelete(guide._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Guide Profile
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="px-6 pb-6">
              <Separator className="my-6" />
              <h3 className="text-xl font-bold mb-4">
                Guide Reviews ({guide.reviews.length})
              </h3>
              <div className="space-y-4 max-h-56 overflow-y-auto pr-3">
                {guide.reviews.length > 0 ? (
                  guide.reviews.map((review) => (
                    <div
                      key={review.user}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <img
                        src={review.avatar}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{review.fullName}</p>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-muted text-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No reviews found for this guide.
                  </p>
                )}
              </div>
            </div>
          </div>

          <SheetFooter className="border-t p-6 bg-muted/50">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" className="red-gradient" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
