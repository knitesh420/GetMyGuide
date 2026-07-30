// app/(website)/tourist/onboarding/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { AppDispatch, RootState } from "@/lib/store";
import { getMyTouristProfile, updateMyTouristProfile } from "@/lib/redux/thunks/tourist/touristThunk";
import { fetchLanguages } from "@/lib/redux/thunks/admin/languageThunks";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const BUDGET_OPTIONS = ["Budget", "Mid-range", "Luxury"];

export default function TouristOnboardingPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { myProfile, loading, error } = useSelector((state: RootState) => state.tourist);
  const { languages } = useSelector((state: RootState) => state.admin);

  const [formData, setFormData] = useState({
    nationality: "",
    budget: "",
    travelInterests: "",
    about: "",
    numberOfTravelers: "1",
    startDate: "",
    endDate: "",
  });
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  // `?edit=1` (from the dashboard's "Edit Profile" / "Complete your profile"
  // links) turns this page into the profile editor. Without the flag a finished
  // profile is still bounced to the dashboard, so the first-time onboarding flow
  // is completely unchanged. Stays `null` until resolved on the client so the
  // redirect never fires before we know which mode we're in.
  const [editMode, setEditMode] = useState<boolean | null>(null);

  useEffect(() => {
    setEditMode(new URLSearchParams(window.location.search).get("edit") === "1");
  }, []);

  useEffect(() => {
    dispatch(getMyTouristProfile());
    dispatch(fetchLanguages());
  }, [dispatch]);

  useEffect(() => {
    if (editMode === false && myProfile?.registrationCompleted) {
      router.push("/dashboard/user");
    }
  }, [editMode, myProfile, router]);

  useEffect(() => {
    if (myProfile) {
      setFormData({
        nationality: myProfile.nationality || "",
        budget: myProfile.budget || "",
        travelInterests: myProfile.travelInterests?.join(", ") || "",
        about: myProfile.about || "",
        numberOfTravelers: String(myProfile.numberOfTravelers || 1),
        startDate: myProfile.travelDates?.startDate?.slice(0, 10) || "",
        endDate: myProfile.travelDates?.endDate?.slice(0, 10) || "",
      });
      setSelectedLanguages(myProfile.preferredLanguages || []);
    }
  }, [myProfile]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.nationality.trim()) return toast.error("Nationality is required.");
    if (!formData.budget) return toast.error("Please select a budget.");
    if (!formData.about.trim()) return toast.error("Please tell us a bit about yourself.");

    const result = await dispatch(
      updateMyTouristProfile({
        nationality: formData.nationality.trim(),
        preferredLanguages: selectedLanguages,
        travelInterests: formData.travelInterests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        budget: formData.budget,
        travelDates:
          formData.startDate || formData.endDate
            ? { startDate: formData.startDate || undefined, endDate: formData.endDate || undefined }
            : undefined,
        numberOfTravelers: parseInt(formData.numberOfTravelers, 10) || 1,
        about: formData.about.trim(),
      }),
    );

    if (updateMyTouristProfile.fulfilled.match(result)) {
      toast.success(editMode ? "Profile updated!" : "Profile saved! Welcome aboard.");
      router.push("/dashboard/user");
    } else {
      toast.error((result.payload as string) || "Failed to save profile.");
    }
  };

  const languageOptions: Option[] = Array.isArray(languages)
    ? languages.map((lang) => ({ value: lang.languageName, label: lang.languageName }))
    : [];

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-8 pt-28">
      <div className="bg-card p-6 md:p-8 rounded-lg shadow-md border">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-card-foreground">
            {editMode ? "Edit Your Travel Preferences" : "Tell Us About Your Trip"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {editMode
              ? "Keep your details up to date to get better guide matches."
              : "A few quick details so we can personalize your experience."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                placeholder="e.g. Indian"
                required
              />
            </div>
            <div>
              <Label htmlFor="numberOfTravelers">Number of Travelers</Label>
              <Input
                id="numberOfTravelers"
                name="numberOfTravelers"
                type="number"
                min={1}
                value={formData.numberOfTravelers}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div>
            <Label>Preferred Languages</Label>
            <MultiSelect
              options={languageOptions}
              selected={selectedLanguages}
              onChange={setSelectedLanguages}
              placeholder="Select languages..."
            />
          </div>

          <div>
            <Label htmlFor="travelInterests">Travel Interests (comma separated)</Label>
            <Input
              id="travelInterests"
              name="travelInterests"
              value={formData.travelInterests}
              onChange={handleInputChange}
              placeholder="e.g. History, Food, Adventure, Wildlife"
            />
          </div>

          <div>
            <Label htmlFor="budget">Budget</Label>
            <div className="grid grid-cols-3 gap-3 mt-1">
              {BUDGET_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setFormData((prev) => ({ ...prev, budget: option }))}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                    formData.budget === option
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startDate">Travel Start Date (optional)</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Travel End Date (optional)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="about">About You</Label>
            <Textarea
              id="about"
              name="about"
              value={formData.about}
              onChange={handleInputChange}
              rows={4}
              placeholder="Tell your guide a little about yourself and what you're looking for..."
              required
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full red-gradient" size="lg">
              {loading ? "Saving..." : editMode ? "Save Changes" : "Continue to Dashboard"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
